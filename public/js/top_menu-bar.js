class HeaderComponent extends HTMLElement {
    connectedCallback() {
        const loggedInUsername = localStorage.getItem('loggedInUsername');

        if (!loggedInUsername) {
            window.location.href = 'index.html';
            return;
        }

        this.innerHTML = `
            <header>
                <button class="menu-button"><i class="fas fa-bars"></i></button>
                <button class="menu-user"><i class="fas fa-user"></i></button>
            </header>
            <nav id="menu" class="menu">
                <ul>
                    <li><a href="#" id="connection-info-btn">연결 상태</a></li>
                    <li><a href="#" id="help-info-btn">문의 사항</a></li>
                    <li><a href="#" id="version-info-btn">버전 정보</a></li>
                    <li><a href="#" onclick="exitApp()">앱 종료</a></li>
                </ul>
            </nav>
            <nav id="menu1" class="menu1">
                <div class="profile-section">
                    <i class="fas fa-user"></i>
                    <h2>${loggedInUsername}</h2>
                    <p><i2 class="fas fa-map-marker-alt"></i2> <span id="location">위치 정보를 가져오는 중...</span></p>
                </div>
                <ul>
                    <li><a href="#" id="user-info-btn">사용자 정보</a></li>
                    <li><a href="index.html" class="logout-btn" id="logout-btn">로그아웃 <i class="fas fa-sign-out-alt"></i></a></li>
                </ul>
            </nav>
        `;

        const checkAddressInterval = setInterval(() => {
            console.log('Checking addresses:', { jibunAddress, roadAddress, jibunAddress1, roadAddress1, jibunAddress2, roadAddress2 });
            if (jibunAddress && roadAddress && jibunAddress1 && roadAddress1 && jibunAddress2 && roadAddress2) {
                this.updateLocation();
                clearInterval(checkAddressInterval);
            }
        }, 1000);
    }

    updateLocation() {
        const locationElement = document.getElementById('location');
        locationElement.parentElement.innerHTML = `
            <p style="text-align: left;">
                <i2 class="fas fa-map-marker-alt"></i2>
                <span>[지번] ${jibunAddress1}</span><br>
                <span>${jibunAddress2}</span><br>
                <span style="padding-left: 0.48em;">[도로명] ${roadAddress1}</span><br>
                <span>${roadAddress2}</span>
            </p>
        `;
    }
}

customElements.define('header-component', HeaderComponent);

document.addEventListener('DOMContentLoaded', function () {
    function setupMenuToggle(menuId, buttonClass, otherMenuId) {
        const menu = document.getElementById(menuId);
        const menuButton = document.querySelector(buttonClass);
        const otherMenu = document.getElementById(otherMenuId);

        menuButton.addEventListener('click', function (event) {
            event.stopPropagation();
            
            if (otherMenu.classList.contains('active')) {
                otherMenu.classList.remove('active');
            }

            menu.classList.toggle('active');
        });

        document.addEventListener('click', function (event) {
            if (!menu.contains(event.target) && menu.classList.contains('active')) {
                menu.classList.remove('active');
            }
        });
    }

    setupMenuToggle('menu', '.menu-button', 'menu1');
    setupMenuToggle('menu1', '.menu-user', 'menu');
});

document.addEventListener('DOMContentLoaded', function() {
    function showConnectionInfo() {
        Swal.fire({
            title: '네트워크 상태가 양호합니다!',
            icon: 'success',
            confirmButtonText: '확인',
            confirmButtonColor: '#00b7ff',
            heightAuto: false
        });
    }

    const connectionInfoBtn = document.getElementById('connection-info-btn');
    if (connectionInfoBtn) {
        connectionInfoBtn.addEventListener('click', showConnectionInfo);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    function showHelpInfo() {
        Swal.fire({
            title: '문의 사항',
            html: '<strong>도움이 필요하시다면?</strong><br><br>E-mail : jeon@gmail.com',
            icon: 'info',
            confirmButtonText: '확인',
            confirmButtonColor: '#00b7ff',
            heightAuto: false
        });
    }

    const helpInfoBtn = document.getElementById('help-info-btn');
    if (helpInfoBtn) {
        helpInfoBtn.addEventListener('click', showHelpInfo);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    function showVersionInfo() {
        Swal.fire({
            title: 'Random Restaurant',
            html: `
                <div style="text-align: left; line-height: 1.6;">
                    <p><strong>버전 정보 :</strong> -</p>
                    <p><strong>빌드 날짜 :</strong> -</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: '확인',
            confirmButtonColor: '#00b7ff',
            heightAuto: false
        });
    }

    const versionInfoBtn = document.getElementById('version-info-btn');
    if (versionInfoBtn) {
        versionInfoBtn.addEventListener('click', showVersionInfo);
    }
});

function exitApp() {
    Swal.fire({
        title: '앱을 종료하시겠습니까?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '예',
        cancelButtonText: '아니오',
        confirmButtonColor: '#00b7ff',
        cancelButtonColor: '#aaa',
        heightAuto: false
    }).then((result) => {
        if (result.isConfirmed) {
            Android.closeApp();
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    function showUserInfo() {
        Swal.fire({
            title: '사용자 정보',
            html: `
                <div style="text-align: left; line-height: 1.6;">
                    <p><strong>- :</strong> -</p>
                    <p><strong>- :</strong> -</p>
                    <p><strong>- :</strong> -</p>
                    <p><strong>- :</strong> -</p>
                    <p><strong>- :</strong> -</p>
                </div>
            `,
            icon: 'info',
            confirmButtonText: '확인',
            confirmButtonColor: '#00b7ff',
            heightAuto: false
        });
    }

    const userInfoBtn = document.getElementById('user-info-btn');
    if (userInfoBtn) {
        userInfoBtn.addEventListener('click', showUserInfo);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('loggedInUsername');
        });
    }
});