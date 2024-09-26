let jibunAddress; // 지번 주소 저장
let roadAddress; // 도로명 주소 저장
let map; // 지도 객체를 전역 변수로 이동
let marker; // 전역 변수로 마커 선언

document.addEventListener('DOMContentLoaded', function() {
    // Naver Maps API 로드 확인
    if (typeof naver === 'undefined' || !naver.maps) {
        console.error('Naver Maps API is not loaded.');
        return;
    }

    const recommendButton = document.getElementById('recommend-button');
    const restaurantInfo = document.getElementById('restaurant-info');

    function initMap() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const currentPosition = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);
                console.log('Current Position:', currentPosition); // 위치 정보 로그 추가
                map = new naver.maps.Map('map', {
                    center: currentPosition,
                    zoom: 17,
                    scaleControl: true,
                    zoomControl: true,
                    zoomControlOptions: {
                        position: naver.maps.Position.TOP_RIGHT
                    }
                });

                new naver.maps.Marker({
                    position: currentPosition,
                    map: map
                });

                new naver.maps.Circle({
                    map: map,
                    center: currentPosition,
                    radius: 500,
                    strokeColor: '#5347AA',
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    fillColor: '#CFE7FF',
                    fillOpacity: 0.5
                });

                // 현재 위치의 상세 주소를 불러옴
                fetchReverseGeocode(position.coords.latitude, position.coords.longitude);
            }, function(error) {
                console.error('Error occurred. Error code: ' + error.code);
                // Handle error case
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        alert("User denied the request for Geolocation.");
                        break;
                    case error.POSITION_UNAVAILABLE:
                        alert("Location information is unavailable.");
                        break;
                    case error.TIMEOUT:
                        alert("The request to get user location timed out.");
                        break;
                    case error.UNKNOWN_ERROR:
                        alert("An unknown error occurred.");
                        break;
                }
            });
        } else {
            alert('Geolocation을 지원하지 않는 브라우저입니다.');
        }
    }

    function fetchReverseGeocode(lat, lng) {
        fetch(`/proxy/reverse-geocode?lat=${lat}&lng=${lng}`)
            .then(response => response.json())
            .then(data => {
                console.log('Reverse Geocoding 응답:', data);
                if (data.results && data.results.length > 0) {
                    const addresses = extractAddresses(data.results);
                    console.log('지번 주소:', addresses.jibunAddress);
                    console.log('도로명 주소:', addresses.roadAddress);
                    jibunAddress = addresses.jibunAddress; // 지번 주소 저장
                    roadAddress = addresses.roadAddress; // 도로명 주소 저장
                } else {
                    console.error('상세 주소를 가져오는 데 실패했습니다.');
                }
            })
            .catch(error => {
                console.error('Reverse Geocoding 오류:', error);
            });
    }

    function searchRestaurants(lat, lng) {
        console.log(`Fetching restaurants at lat: ${lat}, lng: ${lng}`); // 서버 요청 로그 추가

        fetch(`/search-restaurant?lat=${lat}&lng=${lng}&roadAddress=${encodeURIComponent(roadAddress)}&jibunAddress=${encodeURIComponent(jibunAddress)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server Response:', data); // 서버 응답 로그 추가
                if (data.items && data.items.length > 0) {
                    const randomRestaurant = data.items[Math.floor(Math.random() * data.items.length)]; // 랜덤으로 1개 선택
                    restaurantInfo.innerHTML = `
                        <h2>${randomRestaurant.title}</h2>
                        <p>${randomRestaurant.address}</p>
                        <p>${randomRestaurant.telephone}</p>
                        <a href="${randomRestaurant.link}" target="_blank">자세히 보기</a>
                    `;

                    // mapx, mapy 값을 TM128 좌표계에서 WGS84 좌표계로 변환
                    const tm128 = new naver.maps.Point(randomRestaurant.mapx, randomRestaurant.mapy);
                    const latLng = naver.maps.TransCoord.fromTM128ToLatLng(tm128);

                    // 기존 마커 제거
                    if (marker) {
                        marker.setMap(null);
                    }

                    // 새로운 마커 추가
                    marker = new naver.maps.Marker({
                        position: latLng,
                        map: map
                    });

                    // 지도 중심을 마커 위치로 이동
                    map.setCenter(latLng);
                } else {
                    console.log('No restaurants found within 500 meters.'); // 추가 로그
                    restaurantInfo.innerHTML = '반경 500미터 내에 식당이 없습니다.';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                restaurantInfo.innerHTML = '식당 정보를 가져오는 중 오류가 발생했습니다.';
            });
    }

    recommendButton.addEventListener('click', function() {
        if (!jibunAddress && !roadAddress) {
            alert('현재 위치를 확인할 수 없습니다.');
            return;
        }

        // currentPosition을 기반으로 검색
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            searchRestaurants(lat, lng);
        });
    });

    initMap();
});

function extractAddresses(results) {
    let jibunAddress = '';
    let roadAddress = '';
    results.forEach(result => {
        const { region, land } = result;
        const { area1, area2, area3 } = region;
        const { name, number1, number2 } = land;
        const jibunFullAddress = `${area1.name} ${area2.name} ${area3.name} ${number1 ? number1 : ''}${number2 ? '-' + number2 : ''}`;
        const roadFullAddress = `${area1.name} ${area2.name} ${name} ${number1 ? number1 : ''}${number2 ? '-' + number2 : ''}`;
        if (result.name === 'roadaddr') {
            roadAddress = roadFullAddress;
        } else if (result.name === 'addr') {
            jibunAddress = jibunFullAddress;
        }
    });
    return { jibunAddress, roadAddress };
}