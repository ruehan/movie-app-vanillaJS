// 상수 및 전역 변수
const API_KEY = "9a6d44c0d0b383c44231e5cae733bb81";
const API_BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/";
const FALLBACK_IMAGE_URL = "https://upload.wikimedia.org/wikipedia/commons/d/d1/Image_not_available.png";

let currentPage = 1;
let currentCategory = "now_playing";
let isLoading = false;
let hasMoreMovies = true;
let searchQuery = "";
let genres = {};

// DOM 요소
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const movieGrid = document.getElementById("movieGrid");
const loadingIndicator = document.getElementById("loadingIndicator");
const modal = document.getElementById("movieModal");
const modalContent = document.getElementById("modalContent");
const closeBtn = document.getElementsByClassName("close")[0];

// 이벤트 리스너
searchButton.addEventListener("click", handleSearch);
searchInput.addEventListener("keypress", (e) => {
	if (e.key === "Enter") handleSearch();
});
document.querySelectorAll("nav a").forEach((link) => {
	link.addEventListener("click", handleCategoryChange);
});

// 초기 로드
window.addEventListener("load", () => {
	fetchGenres();
	fetchMovies();
	setupInfiniteScroll();
});

// 장르 정보 가져오기
async function fetchGenres() {
	try {
		const url = `${API_BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=ko-KR`;
		const response = await fetch(url);
		const data = await response.json();
		genres = Object.fromEntries(data.genres.map((genre) => [genre.id, genre.name]));
	} catch (error) {
		console.error("Error fetching genres:", error);
	}
}

// 무한 스크롤 설정
function setupInfiniteScroll() {
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting && !isLoading && hasMoreMovies) {
				if (currentCategory === "search") {
					fetchSearchResults(searchQuery);
				} else {
					fetchMovies();
				}
			}
		},
		{
			threshold: 1,
			rootMargin: "0px 0px 100px 0px",
		}
	);

	observer.observe(loadingIndicator);
}

// API에서 영화 데이터 가져오기
async function fetchMoviesFromAPI(url) {
	if (isLoading || !hasMoreMovies) return;

	isLoading = true;
	loadingIndicator.style.display = "block";

	try {
		await new Promise((resolve) => setTimeout(resolve, 1000)); // 1초 지연

		const response = await fetch(url);
		const data = await response.json();

		if (data.results && data.results.length > 0) {
			displayMovies(data.results);
			currentPage++;
			hasMoreMovies = currentPage <= data.total_pages;
		} else {
			hasMoreMovies = false;
			if (currentPage === 1) {
				movieGrid.innerHTML = "<p>검색 결과가 없습니다.</p>";
			}
		}
	} catch (error) {
		console.error("Error fetching movies:", error);
		hasMoreMovies = false;
	} finally {
		isLoading = false;
		// loadingIndicator.style.display = 'none';
	}
}

// 영화 가져오기
function fetchMovies() {
	const url = `${API_BASE_URL}/movie/${currentCategory}?api_key=${API_KEY}&language=ko-KR&page=${currentPage}`;
	fetchMoviesFromAPI(url);
}

// 검색 결과 가져오기
function fetchSearchResults(query) {
	const url = `${API_BASE_URL}/search/movie?api_key=${API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}&page=${currentPage}`;
	fetchMoviesFromAPI(url);
}

// 영화 표시하기
function displayMovies(movies) {
	const fragment = document.createDocumentFragment();
	movies.forEach((movie) => {
		const movieCard = createMovieCard(movie);
		fragment.appendChild(movieCard);
	});
	movieGrid.appendChild(fragment);
}

// 영화 카드 생성
function createMovieCard(movie) {
	const card = document.createElement("div");
	card.className = "movie-card";

	const posterPath = movie.poster_path ? `${IMAGE_BASE_URL}w500${movie.poster_path}` : FALLBACK_IMAGE_URL;

	const movieGenres = movie.genre_ids
		.map((id) => genres[id])
		.filter(Boolean)
		.slice(0, 2)
		.join(", ");

	const truncatedOverview = truncateText(movie.overview || "줄거리 정보가 없습니다.", 150);

	card.innerHTML = `
    <div class="movie-poster">
      <img src="${posterPath}" alt="${movie.title}" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE_URL}';">
      <div class="movie-overlay">
        <div class="movie-summary">
          <h3>${movie.title}</h3>
          <p class="release-date">${movie.release_date}</p>
          <p class="summary">${truncatedOverview}</p>
        </div>
      </div>
    </div>
    <div class="movie-card-content">
      <h3>${movie.title}</h3>
      <p class="rating">평점: ${movie.vote_average.toFixed(1)}/10</p>
			<p class="release-date">${movie.release_date}</p>
    </div>
  `;

	card.addEventListener("click", () => fetchAndDisplayMovieDetails(movie.id));

	return card;
}

// 텍스트 자르기
function truncateText(text, maxLength) {
	if (text.length <= maxLength) return text;
	return text.substr(0, maxLength) + "...";
}

// 영화 상세 정보 가져오기 및 표시
async function fetchAndDisplayMovieDetails(movieId) {
	try {
		const [movieDetails, credits, videos] = await Promise.all([
			fetch(`${API_BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`).then((res) => res.json()),
			fetch(`${API_BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`).then((res) => res.json()),
			fetch(`${API_BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=ko-KR`).then((res) => res.json()),
		]);

		movieDetails.credits = credits;
		displayMovieModal(movieDetails, videos.results[0]);
	} catch (error) {
		console.error("Error fetching movie details:", error);
		modalContent.innerHTML = "<p>영화 정보를 불러오는 데 실패했습니다.</p>";
	}

	modal.style.display = "block";
	document.body.style.overflow = "hidden";
}

// 영화 모달 표시
function displayMovieModal(movie, videos) {
	console.log(movie);
	// console.log(movie);
	const genreNames = movie.genres.map((genre) => genre.name).join(", ");

	modalContent.innerHTML = `
    <div class="modal-backdrop" style="background-image: url('${IMAGE_BASE_URL}w1280${movie.backdrop_path}');">
      <div class="modal-content-overlay">
        <div class="modal-header">
          <h2>${movie.title} (${movie.release_date.split("-")[0]})
          <div class="modal-rating">
              <div class="rating-circle" style="--rating: ${movie.vote_average * 10}%;">
                ${movie.vote_average.toFixed(1)}
              </div>
            </div></h2>
          <p>${genreNames} • ${movie.runtime}분</p>
        </div>
        <div class="modal-body">
          <div class="modal-poster">
            <img src="${IMAGE_BASE_URL}w500${movie.poster_path}" alt="${movie.title}">
            
          </div>
          <div class="modal-info">
            <div class="modal-tabs">
              <button class="tab-button active" data-tab="overview">개요</button>
              <button class="tab-button" data-tab="cast">출연진</button>
              <button class="tab-button" data-tab="videos">예고편</button>
            </div>
            <div class="tab-content active" id="overview">
              <p class="tagline">"${movie.tagline || ""}"</p>
              <h3>개요</h3>
              <p>${movie.overview || "개요 정보가 없습니다."}</p>

            </div>
            <div class="tab-content" id="cast">
              <h3>주요 출연진</h3>
              <div class="cast-list">
                ${movie.credits.cast
									.slice(0, 6)
									.map(
										(actor) => `
                  <div class="cast-member">
                    <img src="${actor.profile_path ? IMAGE_BASE_URL + "w185" + actor.profile_path : FALLBACK_IMAGE_URL}" alt="${actor.name}">
                    <p class="actor-name">${actor.name}</p>
                    <p class="character-name">${actor.character}</p>
                  </div>
                `
									)
									.join("")}
              </div>
            </div>
             <div class="tab-content" id="videos">
              <div class="videos">
  ${
		videos
			? `<iframe 
           width="560" 
           height="315" 
           src="https://www.youtube.com/embed/${videos.key}" 
           frameborder="0" 
           allow="autoplay; encrypted-media" 
           allowfullscreen
         ></iframe>`
			: "<p>사용 가능한 비디오가 없습니다.</p>"
	}
</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

	// Add event listeners to tab buttons
	const tabButtons = modalContent.querySelectorAll(".tab-button");
	const tabContents = modalContent.querySelectorAll(".tab-content");

	tabButtons.forEach((button) => {
		button.addEventListener("click", () => {
			const tab = button.dataset.tab;

			tabButtons.forEach((btn) => btn.classList.remove("active"));
			tabContents.forEach((content) => content.classList.remove("active"));

			button.classList.add("active");
			document.getElementById(tab).classList.add("active");
		});
	});
}

// 검색 처리
function handleSearch() {
	searchQuery = searchInput.value.trim();
	if (searchQuery) {
		currentPage = 1;
		currentCategory = "search";
		movieGrid.innerHTML = "";
		hasMoreMovies = true;
		fetchSearchResults(searchQuery);
	}
}

// 카테고리 변경 처리
function handleCategoryChange(event) {
	console.log(event.target);
	event.preventDefault();
	const newCategory = event.target.dataset.category;
	if (newCategory !== currentCategory) {
		currentCategory = newCategory;
		currentPage = 1;
		movieGrid.innerHTML = "";
		hasMoreMovies = true;
		searchQuery = "";
		searchInput.value = "";
		fetchMovies();
	}
}

// 모달 닫기
function closeModal() {
	modal.style.display = "none";
	document.body.style.overflow = "auto";
}

// 모달 관련 이벤트 리스너
closeBtn.onclick = closeModal;
window.onclick = (event) => {
	if (event.target == modal) closeModal();
};
document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && modal.style.display === "block") closeModal();
});
