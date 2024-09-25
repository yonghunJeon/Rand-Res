document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');

    const savedUsername = localStorage.getItem('username');
    const savedPassword = localStorage.getItem('password');
    const isRememberMeChecked = localStorage.getItem('rememberMe') === 'true';

    if (isRememberMeChecked) {
        usernameInput.value = savedUsername || '';
        passwordInput.value = savedPassword || '';
        rememberMeCheckbox.checked = true;
    }

    document.getElementById('login-form').addEventListener('submit', function(event) {
        event.preventDefault();

        if (rememberMeCheckbox.checked) {
            localStorage.setItem('username', usernameInput.value);
            localStorage.setItem('password', passwordInput.value);
            localStorage.setItem('rememberMe', true);
        } else {
            localStorage.removeItem('username');
            localStorage.removeItem('password');
            localStorage.setItem('rememberMe', false);
        }

        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: '로그인 성공!',
                    text: data.message,
                    confirmButtonText: '확인'
                }).then(() => {
                    localStorage.setItem('loggedInUsername', usernameInput.value);
                    window.location.href = 'map_page.html';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: '로그인 실패',
                    text: data.message,
                    confirmButtonText: '확인',
                    heightAuto: false
                });
            }
        })
        .catch(error => {
            console.error('로그인 오류:', error);
            Swal.fire({
                icon: 'error',
                title: '오류',
                text: '로그인 중 문제가 발생했습니다.',
                confirmButtonText: '확인',
                heightAuto: false
            });
        });
    });
});
