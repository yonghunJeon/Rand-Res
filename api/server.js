require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.log('MongoDB 연결 오류:', err));

const userSchema = new mongoose.Schema({
    accesskey: String,
    username: String,
    password: String,
    email: String,
    count: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);

const guestSchema = new mongoose.Schema({
    guest: String,
    jibunAddress: String,
    roadAddress: String,
    latitude: Number,
    longitude: Number,
    count: { type: Number, default: 0 }
});

const Guest = mongoose.model('Guest', guestSchema);

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        let count = 150;

        if (req.body.accesskey === 'allowed') {
            count = 500;
        }

        const newUser = new User({
            accesskey: req.body.accesskey,
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email,
            count: count
        });

        await newUser.save();
        res.send('회원가입 성공!');
    } catch (err) {
        res.status(400).send('회원가입 실패: ' + err);
    }
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            req.session.userId = user._id;
            res.json({ status: 'success', message: '로그인 성공!' });
        } else {
            res.status(400).json({ status: 'fail', message: '잘못된 아이디 또는 비밀번호' });
        }
    } catch (err) {
        res.status(400).json({ status: 'error', message: '로그인 중 오류 발생: ' + err });
    }
});

const validKeys = process.env.ACCESS_KEYS.split(/[\n,]+/).map(key => key.trim());

app.post('/verify-access-key', (req, res) => {
    const providedKey = req.body.accesskey;

    if (validKeys.includes(providedKey)) {
        res.json({ success: true, message: '인증 완료' });
    } else {
        res.status(400).json({ success: false, message: '일치하지 않습니다!' });
    }
});

app.post('/check-username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user) {
            res.json({ exists: true, message: '이미 사용 중인 아이디입니다.' });
        } else {
            res.json({ exists: false, message: '사용 가능한 아이디입니다.' });
        }
    } catch (err) {
        res.status(500).json({ exists: false, message: '아이디 확인 중 오류가 발생했습니다.' });
    }
});

app.get('/proxy/reverse-geocode', async (req, res) => {
    const { lat, lng } = req.query;
    const clientId = process.env.NAVER_MAP_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

    try {
        const response = await fetch(`https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&orders=addr,roadaddr&output=json`, {
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Naver API' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 작동 중입니다.`);
});

app.get('/search-restaurant', async (req, res) => {
    const { lat, lng } = req.query;
    const results = [];
    const maxPages = 3;

    try {
        for (let page = 1; page <= maxPages; page++) {
            const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=300&sort=distance&size=15&page=${page}`;
            console.log(`Fetching restaurants for coordinates: (${lat}, ${lng}), page: ${page}`);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `KakaoAK ${process.env.KAKAO_REST_API_KEY}`
                }
            });
            const data = await response.json();
            console.log('Kakao API Response:', data);
            results.push(...data.documents);
        }
        res.json({ documents: results });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Kakao API' });
    }
});

app.get('/geocode-address', async (req, res) => {
    const address = req.query.address;
    const clientId = process.env.NAVER_MAP_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

    try {
        const response = await fetch(`https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`, {
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Geocoding API 호출 오류:', error);
        res.status(500).json({ error: 'Failed to fetch data from Naver Geocoding API' });
    }
});

app.post('/save-guest-location', async (req, res) => {
    try {
        const newGuest = new Guest({
            guest: req.body.guest,
            jibunAddress: req.body.jibunAddress,
            roadAddress: req.body.roadAddress,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            count: req.body.count
        });

        await newGuest.save();
        res.json({ status: 'success', message: '위치 저장 성공!' });
    } catch (err) {
        res.status(400).json({ status: 'error', message: '위치 저장 실패: ' + err });
    }
});

app.post('/check-guest-location', async (req, res) => {
    try {
        const guestLocation = await Guest.findOne({ guest: '게스트' });
        if (guestLocation) {
            res.json({ exists: true });
        } else {
            res.json({ exists: false });
        }
    } catch (err) {
        res.status(500).json({ status: 'error', message: '위치 확인 실패: ' + err });
    }
});

app.post('/get-user-count', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user) {
            res.json({ count: user.count });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user count: ' + err });
    }
});

app.post('/get-guest-count', async (req, res) => {
    try {
        const guestId = req.cookies.guestId;
        const guest = await Guest.findOne({ guest: '게스트', guestId: guestId });
        if (guest) {
            res.json({ count: guest.count });
        } else {
            res.status(404).json({ message: 'Guest not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching guest count: ' + err });
    }
});

app.post('/update-user-count', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { username: req.body.username },
            { $set: { count: req.body.count } },
            { new: true }
        );
        if (user) {
            res.json({ status: 'success', count: user.count });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error updating user count: ' + err });
    }
});

app.post('/update-guest-count', async (req, res) => {
    try {
        const guestId = req.cookies.guestId;
        const guest = await Guest.findOneAndUpdate(
            { guest: '게스트', guestId: guestId },
            { $set: { count: req.body.count } },
            { new: true }
        );
        if (guest) {
            res.json({ status: 'success', count: guest.count });
        } else {
            res.status(404).json({ message: 'Guest not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error updating guest count: ' + err });
    }
});

app.post('/guest-login', (req, res) => {
    const guestId = uuidv4();
    res.cookie('guestId', guestId, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ guestId });
});