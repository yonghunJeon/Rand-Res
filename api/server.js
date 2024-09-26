require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

// Body Parser 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 정적 파일 제공 및 캐시 제어 헤더 설정
app.use(express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// 세션 설정
app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // HTTPS를 사용할 때만 true로 설정
}));

// MongoDB 연결 설정
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB 연결 성공'))
    .catch(err => console.log('MongoDB 연결 오류:', err));

// 사용자 스키마 및 모델 설정
const userSchema = new mongoose.Schema({
    accesskey: String,
    username: String,
    password: String,
    email: String
});

const User = mongoose.model('User', userSchema);

// 회원가입 라우트
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            accesskey: req.body.accesskey,
            username: req.body.username,
            password: hashedPassword,
            email: req.body.email
        });

        await newUser.save();
        res.send('회원가입 성공!');
    } catch (err) {
        res.status(400).send('회원가입 실패: ' + err);
    }
});

// 로그인 라우트
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

// 여러 줄로 된 ACCESS_KEYS를 배열로 변환
const validKeys = process.env.ACCESS_KEYS.split(/[\n,]+/).map(key => key.trim());

// 현장 인증 키 확인 라우트
app.post('/verify-access-key', (req, res) => {
    const providedKey = req.body.accesskey;

    if (validKeys.includes(providedKey)) {
        res.json({ success: true, message: '인증 완료' });
    } else {
        res.status(400).json({ success: false, message: '일치하지 않습니다!' });
    }
});

// 아이디 중복 확인 라우트
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

// 프록시 서버 설정
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

// 루트 경로 설정
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 서버 시작
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port}에서 작동 중입니다.`);
});

app.get('/search-restaurant', async (req, res) => {
    const { lat, lng, roadAddress, jibunAddress } = req.query;
    const query = `음식 ${roadAddress || jibunAddress}`;
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=10&start=6&sort=comment`;

    try {
        console.log(`Fetching restaurants for query: ${query}`);
        const response = await fetch(url, {
            headers: {
                'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID,
                'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET
            }
        });
        const data = await response.json();
        console.log('Naver API Response:', data); // 응답 로그 추가
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Naver API' });
    }
});

// geocode-address 라우트 추가
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

// 환경 변수 검증
if (!process.env.NAVER_MAP_CLIENT_ID || !process.env.NAVER_MAP_CLIENT_SECRET) {
    console.error('Naver Map API credentials are missing.');
    process.exit(1);
}

if (!process.env.NAVER_SEARCH_CLIENT_ID || !process.env.NAVER_SEARCH_CLIENT_SECRET) {
    console.error('Naver Search API credentials are missing.');
    process.exit(1);
}

if (!process.env.MONGODB_URI) {
    console.error('MongoDB URI is missing.');
    process.exit(1);
}