const PAGE_SIZE = 12;
let allData = [];
let filtered = [];
let currentPage = 1;
let cityFilter  = "전체";
let typeFilter  = "전체";
let priceFilter = "전체";
let sortMode    = "date";
let searchQ     = "";

async function loadData() {
  try {
    const res = await fetch("data/listings.json");
    const json = await res.json();
    allData = json.data || [];
    document.getElementById("updated").textContent =
      `마지막 업데이트: ${json.updated_at} · 총 ${json.total}건`;
    applyFilters();
    renderStats();
  } catch (e) {
    document.getElementById("updated").textContent = "데이터를 불러올 수 없습니다.";
    console.error(e);
  }
}

function inPriceRange(d) {
  const val = d.type === "매매" ? (d.price || 0) : (d.deposit || 0);
  if (priceFilter === "전체") return true;
  if (priceFilter === "~3억")  return val < 30000;
  if (priceFilter === "3~5억") return val >= 30000 && val < 50000;
  if (priceFilter === "5~7억") return val >= 50000 && val < 70000;
  if (priceFilter === "7억~")  return val >= 70000;
  return true;
}

function applyFilters() {
  filtered = allData.filter(d => {
    if (cityFilter !== "전체" && d.city !== cityFilter) return false;
    if (typeFilter !== "전체" && d.type !== typeFilter) return false;
    if (!inPriceRange(d)) return false;
    if (searchQ && !d.apt.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortMode === "date") {
      return dateStr(b) - dateStr(a);
    }
    if (sortMode === "price-desc") return getPrice(b) - getPrice(a);
    if (sortMode === "price-asc")  return getPrice(a) - getPrice(b);
    if (sortMode === "area-desc")  return b.area - a.area;
    return 0;
  });

  currentPage = 1;
  renderCards();
  renderPagination();
  document.getElementById("result-count").textContent =
    `총 ${filtered.length}건`;
}

function dateStr(d) {
  return parseInt(`${d.year}${String(d.month).padStart(2,'0')}${String(d.day).padStart(2,'0')}`);
}
function getPrice(d) {
  return d.type === "매매" ? (d.price || 0) : (d.deposit || 0);
}

function renderStats() {
  const trades = allData.filter(d => d.type === "매매");
  const rents  = allData.filter(d => d.type === "전세");

  const avgTrade = trades.length
    ? Math.round(trades.reduce((s, d) => s + (d.price || 0), 0) / trades.length)
    : 0;
  const avgRent = rents.length
    ? Math.round(rents.reduce((s, d) => s + (d.deposit || 0), 0) / rents.length)
    : 0;

  const latest = allData[0];
  const latestDate = latest
    ? `${latest.year}.${latest.month}.${latest.day}`
    : "-";

  document.getElementById("stat-total").textContent     = `${allData.length}건`;
  document.getElementById("stat-trade-avg").textContent = `${fmtPrice(avgTrade)}`;
  document.getElementById("stat-rent-avg").textContent  = `${fmtPrice(avgRent)}`;
  document.getElementById("stat-latest").textContent    = latestDate;
}

function fmtPrice(won) {
  if (!won) return "-";
  if (won >= 10000) {
    const uk = Math.floor(won / 10000);
    const rest = won % 10000;
    return rest ? `${uk}억 ${rest.toLocaleString()}만` : `${uk}억`;
  }
  return `${won.toLocaleString()}만`;
}

function renderCards() {
  const grid = document.getElementById("card-grid");
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);

  if (!page.length) {
    grid.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
    return;
  }

  grid.innerHTML = page.map(d => {
    const isTrade = d.type === "매매";
    const priceVal = isTrade ? d.price : d.deposit;
    const priceLabel = isTrade ? "매매가" : "보증금";

    return `
      <div class="card ${isTrade ? "trade" : "rent"}">
        <div class="card-header">
          <span class="card-apt">${d.apt}</span>
          <span class="card-type ${isTrade ? "trade" : "rent"}">${d.type}</span>
        </div>
        <div class="card-price ${isTrade ? "" : "rent-price"}">
          ${priceLabel} ${fmtPrice(priceVal)}
        </div>
        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-label">면적</span>
            <span>${d.area}㎡</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">층</span>
            <span>${d.floor}층</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">동</span>
            <span>${d.dong}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">건축</span>
            <span>${d.built_year}년</span>
          </div>
        </div>
        <div class="card-footer">
          <span>${d.city}</span>
          <span>${d.year}.${d.month}.${d.day}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  const pg = document.getElementById("pagination");
  if (total <= 1) { pg.innerHTML = ""; return; }

  pg.innerHTML = Array.from({length: total}, (_, i) => i + 1)
    .map(n => `<button class="${n === currentPage ? 'active' : ''}" data-page="${n}">${n}</button>`)
    .join("");

  pg.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page);
      renderCards();
      renderPagination();
      window.scrollTo({top: 0, behavior: "smooth"});
    });
  });
}

// 필터 버튼 이벤트
document.querySelectorAll("#filter-city button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#filter-city button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    cityFilter = btn.dataset.value;
    applyFilters();
  });
});

document.querySelectorAll("#filter-type button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#filter-type button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    typeFilter = btn.dataset.value;
    applyFilters();
  });
});

document.querySelectorAll("#filter-price button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#filter-price button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    priceFilter = btn.dataset.value;
    applyFilters();
  });
});

document.getElementById("sort-select").addEventListener("change", e => {
  sortMode = e.target.value;
  applyFilters();
});

let searchTimer;
document.getElementById("search-input").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQ = e.target.value.trim();
    applyFilters();
  }, 300);
});

loadData();
