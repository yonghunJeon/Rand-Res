let isVerified = false;

document.getElementById('sign-up-form').addEventListener('submit', function(event) {
    event.preventDefault();

    let accesskey = document.getElementById('accesskey').value || 'not allowed';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    let email = document.getElementById('email').value;

    if (email.trim() === '') {
        email = 'null';
    }

    if (!isVerified) {
        accesskey = 'not allowed';
    } else {
        accesskey = 'allowed';
    }

    if (username.length < 6 || username.length > 20) {
        Swal.fire({
            icon: 'error',
            title: '아이디 길이 오류',
            text: '아이디는 6자 이상 20자 이하여야 합니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
        return;
    }

    if (password.length < 8 || password.length > 20) {
        Swal.fire({
            icon: 'error',
            title: '비밀번호 길이 오류',
            text: '비밀번호는 8자 이상 20자 이하여야 합니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
        return;
    }

    if (password !== passwordConfirm) {
        Swal.fire({
            icon: 'error',
            title: '비밀번호 불일치',
            text: '비밀번호가 일치하지 않습니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
        return;
    }

    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ accesskey, username, password, email })
    })
    .then(response => response.text())
    .then(data => {
        Swal.fire({
            icon: data === '회원가입 성공!' ? 'success' : 'error',
            title: data === '회원가입 성공!' ? '회원가입 성공' : '회원가입 실패',
            text: data,
            confirmButtonText: '확인',
            heightAuto: false
        }).then(() => {
            if (data === '회원가입 성공!') {
                window.location.href = 'index.html';
            }
        });
    })
    .catch(error => {
        console.error('회원가입 오류:', error);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '회원가입 중 문제가 발생했습니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
    });
});

function verifyAccessKey(accesskey) {
    if (!accesskey) {
        Swal.fire({
            icon: 'warning',
            title: '입력 필요',
            text: '인증 키를 입력하세요!',
            confirmButtonText: '확인',
            heightAuto: false
        });
        return;
    }

    return fetch('/verify-access-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ accesskey })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            isVerified = true;
            Swal.fire({
                icon: 'success',
                title: '인증 완료',
                text: data.message,
                confirmButtonText: '확인',
                heightAuto: false
            });
            const verifyButton = document.getElementById('verify-button');
            verifyButton.textContent = '인증 완료';
            verifyButton.disabled = true;
            verifyButton.style.display = 'block';
            verifyButton.style.textAlign = 'center';
            verifyButton.style.width = '100%';
            verifyButton.style.padding = '10px 0';
            verifyButton.style.borderRadius = '30px';
            verifyButton.style.color = '#00b7ff';
            verifyButton.style.fontSize = '16px';
            verifyButton.style.background = '#f0f0f0';
            verifyButton.style.textDecoration = 'none';
            verifyButton.style.transition = 'background 0.3s ease';
            verifyButton.style.cursor = 'not-allowed';

            const accessKeyInput = document.getElementById('accesskey');
            accessKeyInput.type = 'password';
            accessKeyInput.disabled = true;
        } else {
            isVerified = false;
            Swal.fire({
                icon: 'error',
                title: '인증 실패',
                text: data.message,
                confirmButtonText: '확인',
                heightAuto: false
            });
        }
    })
    .catch(error => {
        console.error('인증 오류:', error);
        isVerified = false;
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '인증 중 문제가 발생했습니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
    });
}

document.querySelector('#verify-button').addEventListener('click', function() {
    const accesskey = document.getElementById('accesskey').value;
    verifyAccessKey(accesskey);
});

function checkUsername() {
    const username = document.getElementById('username').value;

    if (!username) {
        Swal.fire({
            icon: 'error',
            title: '아이디 입력',
            text: '아이디를 입력해주세요.',
            confirmButtonText: '확인',
            heightAuto: false
        });
        return;
    }

    fetch('/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ username })
    })
    .then(response => response.json())
    .then(data => {
        Swal.fire({
            icon: data.exists ? 'error' : 'success',
            title: data.exists ? '아이디 중복' : '아이디 사용 가능',
            text: data.message,
            confirmButtonText: '확인',
            heightAuto: false
        });
    })
    .catch(error => {
        console.error('아이디 중복 확인 오류:', error);
        Swal.fire({
            icon: 'error',
            title: '오류',
            text: '아이디 중복 확인 중 문제가 발생했습니다.',
            confirmButtonText: '확인',
            heightAuto: false
        });
    });
}