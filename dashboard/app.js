let masterDatabase = [];
let activeTab = 'showroom';
let selectedModelForModal = null;

// DOM Elements
const sidebarMenu = document.querySelector('.sidebar-menu');
const tabPanes = document.querySelectorAll('.tab-pane');
const modelCardGrid = document.getElementById('model-card-grid');
const showroomSearchInput = document.getElementById('showroom-search');
const filterFuel = document.getElementById('filter-fuel');
const filterCategory = document.getElementById('filter-category');

const compareSelect1 = document.getElementById('compare-select-1');
const compareSelect2 = document.getElementById('compare-select-2');
const compareResults = document.getElementById('compare-results');
const comparePlaceholderMsg = document.getElementById('compare-placeholder-msg');

const safetyCardGrid = document.getElementById('safety-card-grid');

const explorerSearchInput = document.getElementById('explorer-search');
const explorerTableBody = document.getElementById('explorer-table-body');
const btnExportCsv = document.getElementById('btn-export-csv');

// Modal Elements
const detailsModal = document.getElementById('details-modal');
const modalClose = document.getElementById('modal-close');
const modalModelName = document.getElementById('modal-model-name');
const modalModelBadge = document.getElementById('modal-model-badge');
const modalModelTagline = document.getElementById('modal-model-tagline');
const modalModelPrice = document.getElementById('modal-model-price');
const modalModelDesc = document.getElementById('modal-model-desc');
const ovStatVariants = document.getElementById('ov-stat-variants');
const ovStatFuel = document.getElementById('ov-stat-fuel');
const ovStatSafety = document.getElementById('ov-stat-safety');
const modalHeroImg = document.getElementById('modal-hero-img');
const modalTrimList = document.getElementById('modal-trim-list');
const modalSpecsGrid = document.getElementById('modal-specs-grid');
const modalGalleryGrid = document.getElementById('modal-gallery-grid');
const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
const modalPanes = document.querySelectorAll('.modal-pane');

// Chart instances
let priceChartInstance = null;
let fuelChartInstance = null;
let rangeChartInstance = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  fetchData();
  initSearchAndFilters();
  initComparisonDropdowns();
  initModalTabs();
  initCsvExport();
});

// Tab Routing Logic
function initTabs() {
  sidebarMenu.addEventListener('click', (e) => {
    const btn = e.target.closest('.menu-item');
    if (!btn) return;
    
    // Toggle active menu state
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    btn.classList.add('active');
    
    // Toggle tab panes
    activeTab = btn.dataset.tab;
    tabPanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === `pane-${activeTab}`) {
        pane.classList.add('active');
      }
    });
    
    // Trigger tab specific actions (like chart drawing)
    if (activeTab === 'analytics') {
      setTimeout(drawCharts, 100);
    }
  });
}

// Fetch and store database
function fetchData() {
  fetch('/master_database.json')
    .then(res => res.json())
    .then(data => {
      masterDatabase = data;
      
      // Update sidebar quick stats
      updateGlobalStats();
      
      // Render components
      renderShowroom(data);
      populateComparisonOptions(data);
      renderSafetyHub(data);
      renderExplorer(data);
    })
    .catch(err => {
      console.error("Error loading master database:", err);
      modelCardGrid.innerHTML = `
        <div class="loading-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-red);"></i>
          <p>Failed to connect to the Tata Motors database. Ensure the server is running.</p>
        </div>
      `;
    });
}

function updateGlobalStats() {
  const statModels = document.getElementById('stat-models');
  const statVariants = document.getElementById('stat-variants');
  
  if (statModels) statModels.textContent = masterDatabase.length;
  
  let totalVariants = 0;
  masterDatabase.forEach(m => {
    totalVariants += m.variants.length;
  });
  if (statVariants) statVariants.textContent = totalVariants;
}

// Render Showroom Cards
function renderShowroom(data) {
  modelCardGrid.innerHTML = '';
  
  if (data.length === 0) {
    modelCardGrid.innerHTML = `
      <div class="loading-state">
        <i class="fa-solid fa-car-tunnel"></i>
        <p>No models match your filters.</p>
      </div>
    `;
    return;
  }
  
  data.forEach(model => {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.addEventListener('click', () => openModal(model));
    
    // Get starting price
    const prices = model.variants.map(v => v.price).filter(p => p !== null);
    const minPrice = prices.length ? `₹${min(prices).toLocaleString('en-IN')}` : "Upcoming";
    
    // Identify fuel type badges
    const fuels = model.ice_ev_cng.split('/').map(f => f.trim());
    let fuelBadgesHtml = '';
    fuels.forEach(f => {
      fuelBadgesHtml += `<span class="fuel-badge">${f}</span>`;
    });
    
    // Find hero image
    let heroImgSrc = "/content/dam/tml/ev/general/banner-placeholder.png";
    if (model.variants.length > 0 && model.variants[0].media.exterior_image_urls.length > 0) {
      // Find first image URL that has a filename
      heroImgSrc = model.variants[0].media.exterior_image_urls[0];
    }
    
    card.innerHTML = `
      <div class="model-card-header">
        <div>
          <h3>${model.model_name}</h3>
          <span class="model-card-segment">${model.segment}</span>
        </div>
        <span class="badge-tag ${model.vehicle_type === 'EV' ? 'ev' : ''}">${model.vehicle_type}</span>
      </div>
      
      <div class="model-card-image-container">
        <img class="model-card-img" src="${heroImgSrc}" alt="${model.model_name}" onerror="this.src='https://s7ap1.scene7.com/is/image/tatamotors/altroz-homepage-banner-desktop?fit=crop&fmt=avif-alpha'">
      </div>
      
      <div class="model-card-footer">
        <div class="price-block">
          <span>Starting Price</span>
          <h4>${minPrice}</h4>
        </div>
        <div class="fuel-tags">
          ${fuelBadgesHtml}
        </div>
      </div>
    `;
    
    modelCardGrid.appendChild(card);
  });
}

function min(arr) {
  return Math.min(...arr);
}

function max(arr) {
  return Math.max(...arr);
}

// Search and Filtering Showroom
function initSearchAndFilters() {
  const filterFn = () => {
    const q = showroomSearchInput.value.toLowerCase();
    const fuel = filterFuel.value.toLowerCase();
    const cat = filterCategory.value.toLowerCase();
    
    const filtered = masterDatabase.filter(model => {
      const matchQ = model.model_name.toLowerCase().includes(q) || 
                     model.tagline.toLowerCase().includes(q) || 
                     model.variants.some(v => v.variant_name.toLowerCase().includes(q));
      
      const matchFuel = fuel === 'all' || 
                        model.ice_ev_cng.toLowerCase().includes(fuel) ||
                        (fuel === 'electric' && model.vehicle_type === 'EV');
                        
      const matchCat = cat === 'all' || model.category.toLowerCase().includes(cat);
      
      return matchQ && matchFuel && matchCat;
    });
    
    renderShowroom(filtered);
  };
  
  showroomSearchInput.addEventListener('input', filterFn);
  filterFuel.addEventListener('change', filterFn);
  filterCategory.addEventListener('change', filterFn);
}

// Populates dropdown options for Comparison
function populateComparisonOptions(data) {
  compareSelect1.innerHTML = '<option value="">Select Variant 1</option>';
  compareSelect2.innerHTML = '<option value="">Select Variant 2</option>';
  
  data.forEach(model => {
    const optGroup1 = document.createElement('optgroup');
    optGroup1.label = model.model_name;
    const optGroup2 = document.createElement('optgroup');
    optGroup2.label = model.model_name;
    
    model.variants.forEach(v => {
      const optVal = `${model.model_name}||${v.variant_code}`;
      const optText = `${v.variant_name} (${v.fuel_type}) - ₹${(v.price || 0).toLocaleString('en-IN')}`;
      
      const opt1 = new Option(optText, optVal);
      const opt2 = new Option(optText, optVal);
      
      optGroup1.appendChild(opt1);
      optGroup2.appendChild(opt2);
    });
    
    compareSelect1.appendChild(optGroup1);
    compareSelect2.appendChild(optGroup2);
  });
}

function initComparisonDropdowns() {
  const compareFn = () => {
    const val1 = compareSelect1.value;
    const val2 = compareSelect2.value;
    
    if (!val1 || !val2) {
      compareResults.style.display = 'none';
      comparePlaceholderMsg.style.display = 'flex';
      return;
    }
    
    compareResults.style.display = 'block';
    comparePlaceholderMsg.style.display = 'none';
    
    const [modelName1, code1] = val1.split('||');
    const [modelName2, code2] = val2.split('||');
    
    const model1 = masterDatabase.find(m => m.model_name === modelName1);
    const model2 = masterDatabase.find(m => m.model_name === modelName2);
    
    const var1 = model1.variants.find(v => v.variant_code === code1);
    const var2 = model2.variants.find(v => v.variant_code === code2);
    
    renderComparisonTable(model1, var1, model2, var2);
  };
  
  compareSelect1.addEventListener('change', compareFn);
  compareSelect2.addEventListener('change', compareFn);
}

// Render Comparison side by side table
function renderComparisonTable(m1, v1, m2, v2) {
  const grid = compareResults.querySelector('.comparison-grid');
  grid.innerHTML = '';
  
  // Header Row
  grid.innerHTML += `
    <div class="comp-header">VARIANT COMPARISON</div>
    <div class="comp-header-car">
      ${m1.model_name}
      <span>${v1.variant_name}</span>
    </div>
    <div class="comp-header-car">
      ${m2.model_name}
      <span>${v2.variant_name}</span>
    </div>
  `;
  
  // Function to add a spec row
  const addRow = (label, val1, val2, highlightType = null) => {
    let cellClass1 = '';
    let cellClass2 = '';
    
    if (highlightType === 'lower_numeric' && val1 && val2) {
      const num1 = parseFloat(String(val1).replace(/[^\d.]/g, ''));
      const num2 = parseFloat(String(val2).replace(/[^\d.]/g, ''));
      if (num1 < num2) cellClass1 = 'highlight-better';
      if (num2 < num1) cellClass2 = 'highlight-better';
    } else if (highlightType === 'higher_numeric' && val1 && val2) {
      const num1 = parseFloat(String(val1).replace(/[^\d.]/g, ''));
      const num2 = parseFloat(String(val2).replace(/[^\d.]/g, ''));
      if (num1 > num2) cellClass1 = 'highlight-better';
      if (num2 > num1) cellClass2 = 'highlight-better';
    } else if (highlightType === 'yes_no') {
      if (String(val1).toLowerCase() === 'yes') cellClass1 = 'highlight-better';
      if (String(val2).toLowerCase() === 'yes') cellClass2 = 'highlight-better';
    }
    
    grid.innerHTML += `
      <div class="comp-cell-label">${label}</div>
      <div class="comp-cell-value ${cellClass1}">${val1 !== null && val1 !== undefined ? val1 : '-'}</div>
      <div class="comp-cell-value ${cellClass2}">${val2 !== null && val2 !== undefined ? val2 : '-'}</div>
    `;
  };
  
  // Section: Pricing
  grid.innerHTML += `<div class="comp-row-title">Pricing</div>`;
  addRow("Ex-showroom Price", v1.price ? `₹${v1.price.toLocaleString('en-IN')}` : 'Upcoming', v2.price ? `₹${v2.price.toLocaleString('en-IN')}` : 'Upcoming', 'lower_numeric');
  
  // Section: Engine & Powertrain
  grid.innerHTML += `<div class="comp-row-title">Engine & Powertrain</div>`;
  addRow("Fuel Type", v1.fuel_type, v2.fuel_type);
  addRow("Transmission", v1.transmission, v2.transmission);
  
  if (v1.engine_powertrain || v2.engine_powertrain) {
    const e1 = v1.engine_powertrain || {};
    const e2 = v2.engine_powertrain || {};
    addRow("Displacement (cc)", e1.displacement ? `${e1.displacement} cc` : '-', e2.displacement ? `${e2.displacement} cc` : '-', 'higher_numeric');
    addRow("Max Power", e1.power ? `${e1.power} PS` : '-', e2.power ? `${e2.power} PS` : '-', 'higher_numeric');
    addRow("Max Torque", e1.torque ? `${e1.torque} Nm` : '-', e2.torque ? `${e2.torque} Nm` : '-', 'higher_numeric');
  }
  
  // Section: EV Drivetrain
  if (v1.fuel_type === 'Electric' || v2.fuel_type === 'Electric') {
    grid.innerHTML += `<div class="comp-row-title">Electric Specs</div>`;
    const ev1 = v1.ev_specifications || {};
    const ev2 = v2.ev_specifications || {};
    addRow("Battery Pack", ev1.battery_capacity, ev2.battery_capacity);
    addRow("MIDC Claimed Range", ev1.claimed_range, ev2.claimed_range, 'higher_numeric');
    addRow("Estimated Real Range", ev1.real_range, ev2.real_range, 'higher_numeric');
    addRow("V2L / V2V Support", ev1.vehicle_to_load, ev2.vehicle_to_load, 'yes_no');
  }
  
  // Section: Dimensions
  grid.innerHTML += `<div class="comp-row-title">Dimensions</div>`;
  addRow("Length", v1.dimensions.length, v2.dimensions.length);
  addRow("Width", v1.dimensions.width, v2.dimensions.width);
  addRow("Height", v1.dimensions.height, v2.dimensions.height);
  addRow("Wheelbase", v1.dimensions.wheelbase, v2.dimensions.wheelbase);
  addRow("Ground Clearance", v1.dimensions.ground_clearance, v2.dimensions.ground_clearance, 'higher_numeric');
  addRow("Boot Space", v1.dimensions.boot_space, v2.dimensions.boot_space, 'higher_numeric');
  addRow("Seating Capacity", v1.dimensions.seating_capacity, v2.dimensions.seating_capacity);
  
  // Section: Safety
  grid.innerHTML += `<div class="comp-row-title">Safety</div>`;
  addRow("Bharat NCAP Rating", v1.safety.bharat_ncap_rating, v2.safety.bharat_ncap_rating);
  addRow("Global NCAP Rating", v1.safety.global_ncap_rating, v2.safety.global_ncap_rating);
  addRow("Airbags Count", v1.safety.airbags_count, v2.safety.airbags_count, 'higher_numeric');
  addRow("ABS with EBD", v1.safety.abs === 'Yes' && v1.safety.ebd === 'Yes' ? 'Yes' : 'No', v2.safety.abs === 'Yes' && v2.safety.ebd === 'Yes' ? 'Yes' : 'No', 'yes_no');
  addRow("ESP (Stability Program)", v1.safety.esp, v2.safety.esp, 'yes_no');
  addRow("TPMS (Tyre Pressure Monitoring)", v1.safety.tpms, v2.safety.tpms, 'yes_no');
  addRow("ADAS Tech", v1.safety.adas_features, v2.safety.adas_features, 'yes_no');
}

// Render Safety Hub
function renderSafetyHub(data) {
  safetyCardGrid.innerHTML = '';
  
  data.forEach(model => {
    // Unique ratings from model
    const ratingText = model.variants[0]?.safety?.bharat_ncap_rating || model.variants[0]?.safety?.global_ncap_rating || "Unrated";
    const airbags = model.variants[0]?.safety?.airbags_count || "6";
    const adas = model.variants.some(v => v.safety?.adas_features === 'Yes') ? 'Available' : 'Not Available';
    const esp = model.variants[0]?.safety?.esp || "Yes";
    const tpms = model.variants[0]?.safety?.tpms || "No";
    
    const card = document.createElement('div');
    card.className = 'safety-card';
    
    card.innerHTML = `
      <div class="safety-card-header">
        <h3>${model.model_name}</h3>
        <span class="rating-badge">${ratingText}</span>
      </div>
      <div class="safety-details-list">
        <div class="safety-detail-item">
          <span>Standard Airbags</span>
          <span>${airbags}</span>
        </div>
        <div class="safety-detail-item">
          <span>ADAS Technology</span>
          <span>${adas}</span>
        </div>
        <div class="safety-detail-item">
          <span>Electronic Stability Program (ESP)</span>
          <span>${esp}</span>
        </div>
        <div class="safety-detail-item">
          <span>Tyre Pressure Monitoring (TPMS)</span>
          <span>${tpms}</span>
        </div>
      </div>
    `;
    
    safetyCardGrid.appendChild(card);
  });
}

// Render Explorer Table
function renderExplorer(data) {
  explorerTableBody.innerHTML = '';
  
  const query = explorerSearchInput.value.toLowerCase();
  
  data.forEach(model => {
    model.variants.forEach(v => {
      if (query && !model.model_name.toLowerCase().includes(query) && !v.variant_name.toLowerCase().includes(query)) {
        return;
      }
      
      const row = document.createElement('tr');
      
      let priceText = v.price ? `₹${v.price.toLocaleString('en-IN')}` : 'Upcoming';
      let capacityCol = '-';
      let performanceCol = '-';
      
      if (v.fuel_type === 'Electric') {
        capacityCol = v.ev_specifications?.battery_capacity || '-';
        performanceCol = v.ev_specifications?.claimed_range ? `${v.ev_specifications.claimed_range} Claimed` : '-';
      } else {
        capacityCol = v.engine_powertrain?.displacement ? `${v.engine_powertrain.displacement} cc` : '-';
        performanceCol = v.engine_powertrain?.power ? `${v.engine_powertrain.power} PS` : '-';
      }
      
      row.innerHTML = `
        <td><strong>${model.model_name}</strong></td>
        <td>${v.variant_name}</td>
        <td>${v.fuel_type}</td>
        <td>${v.transmission}</td>
        <td>${priceText}</td>
        <td>${capacityCol}</td>
        <td>${performanceCol}</td>
      `;
      
      explorerTableBody.appendChild(row);
    });
  });
}

function initSearchAndFilters() {
  const filterFn = () => {
    const q = showroomSearchInput.value.toLowerCase();
    const fuel = filterFuel.value.toLowerCase();
    const cat = filterCategory.value.toLowerCase();
    
    const filtered = masterDatabase.filter(model => {
      const matchQ = model.model_name.toLowerCase().includes(q) || 
                     model.tagline.toLowerCase().includes(q) || 
                     model.variants.some(v => v.variant_name.toLowerCase().includes(q));
      
      const matchFuel = fuel === 'all' || 
                        model.ice_ev_cng.toLowerCase().includes(fuel) ||
                        (fuel === 'electric' && model.vehicle_type === 'EV');
                        
      const matchCat = cat === 'all' || model.category.toLowerCase().includes(cat);
      
      return matchQ && matchFuel && matchCat;
    });
    
    renderShowroom(filtered);
  };
  
  showroomSearchInput.addEventListener('input', filterFn);
  filterFuel.addEventListener('change', filterFn);
  filterCategory.addEventListener('change', filterFn);
  
  // Explorer search
  explorerSearchInput.addEventListener('input', () => {
    renderExplorer(masterDatabase);
  });
}

// CSV Export logic
function initCsvExport() {
  btnExportCsv.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Model Name,Variant Name,Fuel Type,Transmission,Price,Battery / Displacement,Claimed Range / Power\r\n";
    
    masterDatabase.forEach(model => {
      model.variants.forEach(v => {
        let price = v.price ? v.price : 'Upcoming';
        let capacityCol = '-';
        let performanceCol = '-';
        
        if (v.fuel_type === 'Electric') {
          capacityCol = v.ev_specifications?.battery_capacity || '-';
          performanceCol = v.ev_specifications?.claimed_range || '-';
        } else {
          capacityCol = v.engine_powertrain?.displacement ? `${v.engine_powertrain.displacement} cc` : '-';
          performanceCol = v.engine_powertrain?.power ? `${v.engine_powertrain.power} PS` : '-';
        }
        
        // Escape quotes
        const mName = `"${model.model_name.replace(/"/g, '""')}"`;
        const vName = `"${v.variant_name.replace(/"/g, '""')}"`;
        const cap = `"${capacityCol.replace(/"/g, '""')}"`;
        const perf = `"${performanceCol.replace(/"/g, '""')}"`;
        
        csvContent += `${mName},${vName},${v.fuel_type},${v.transmission},${price},${cap},${perf}\r\n`;
      });
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "tata_motors_explorer_view.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Chart.js visualizations
function drawCharts() {
  // 1. Price Distribution Chart
  const priceCtx = document.getElementById('priceChart').getContext('2d');
  if (priceChartInstance) priceChartInstance.destroy();
  
  const priceLabels = [];
  const priceData = [];
  
  masterDatabase.forEach(model => {
    const prices = model.variants.map(v => v.price).filter(p => p !== null);
    if (prices.length) {
      priceLabels.push(model.model_name);
      priceData.push(min(prices) / 100000); // in lakhs
    }
  });
  
  priceChartInstance = new Chart(priceCtx, {
    type: 'bar',
    data: {
      labels: priceLabels,
      datasets: [{
        label: 'Starting Price (Lakhs INR)',
        data: priceData,
        backgroundColor: 'rgba(0, 210, 255, 0.4)',
        borderColor: 'rgba(0, 210, 255, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9CA3AF' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF', maxRotation: 45, minRotation: 45 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // 2. Fuel Type Pie Chart
  const fuelCtx = document.getElementById('fuelChart').getContext('2d');
  if (fuelChartInstance) fuelChartInstance.destroy();
  
  let pCount = 0, dCount = 0, cCount = 0, eCount = 0;
  masterDatabase.forEach(model => {
    model.variants.forEach(v => {
      if (v.fuel_type === 'Petrol') pCount++;
      else if (v.fuel_type === 'Diesel') dCount++;
      else if (v.fuel_type === 'CNG') cCount++;
      else if (v.fuel_type === 'Electric') eCount++;
    });
  });
  
  fuelChartInstance = new Chart(fuelCtx, {
    type: 'doughnut',
    data: {
      labels: ['Petrol', 'Diesel', 'CNG', 'Electric (EV)'],
      datasets: [{
        data: [pCount, dCount, cCount, eCount],
        backgroundColor: [
          'rgba(255, 200, 87, 0.6)', 
          'rgba(255, 89, 100, 0.6)', 
          'rgba(16, 185, 129, 0.6)', 
          'rgba(0, 210, 255, 0.6)'
        ],
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#9CA3AF' }
        }
      }
    }
  });

  // 3. EV Range Chart
  const rangeCtx = document.getElementById('rangeChart').getContext('2d');
  if (rangeChartInstance) rangeChartInstance.destroy();
  
  const evModels = masterDatabase.filter(m => m.vehicle_type === 'EV');
  const evLabels = [];
  const claimedData = [];
  const realData = [];
  
  evModels.forEach(model => {
    // Find LR/highest range variant
    let maxClaimed = 0;
    model.variants.forEach(v => {
      if (v.ev_specifications?.claimed_range) {
        const val = parseInt(v.ev_specifications.claimed_range.split(' ')[0]);
        if (val > maxClaimed) maxClaimed = val;
      }
    });
    
    if (maxClaimed > 0) {
      evLabels.push(model.model_name);
      claimedData.push(maxClaimed);
      realData.push(Math.round(maxClaimed * 0.75)); // C75 estimate
    }
  });
  
  rangeChartInstance = new Chart(rangeCtx, {
    type: 'bar',
    data: {
      labels: evLabels,
      datasets: [
        {
          label: 'Certified Claimed Range (km)',
          data: claimedData,
          backgroundColor: 'rgba(0, 210, 255, 0.4)',
          borderColor: 'rgba(0, 210, 255, 1)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Estimated Real Range (km)',
          data: realData,
          backgroundColor: 'rgba(16, 185, 129, 0.4)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9CA3AF' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9CA3AF' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#9CA3AF' }
        }
      }
    }
  });
}

// Modal Click Handlers and logic
function openModal(model) {
  selectedModelForModal = model;
  
  modalModelName.textContent = model.model_name;
  modalModelBadge.textContent = model.category;
  modalModelTagline.textContent = model.tagline;
  modalModelDesc.textContent = model.description;
  
  // Set prices
  const prices = model.variants.map(v => v.price).filter(p => p !== null);
  modalModelPrice.textContent = prices.length ? `₹${min(prices).toLocaleString('en-IN')}` : "Upcoming";
  
  // Quick stats
  ovStatVariants.textContent = model.variants.length;
  ovStatFuel.textContent = model.ice_ev_cng;
  
  const ratingText = model.variants[0]?.safety?.bharat_ncap_rating || model.variants[0]?.safety?.global_ncap_rating || "Unrated";
  ovStatSafety.textContent = ratingText;
  
  // Hero Image
  let heroImgSrc = "/content/dam/tml/ev/general/banner-placeholder.png";
  if (model.variants.length > 0 && model.variants[0].media.exterior_image_urls.length > 0) {
    heroImgSrc = model.variants[0].media.exterior_image_urls[0];
  }
  modalHeroImg.src = heroImgSrc;
  
  // Reset tabs to Overview
  modalTabBtns.forEach(btn => btn.classList.remove('active'));
  modalTabBtns[0].classList.add('active');
  modalPanes.forEach(pane => pane.classList.remove('active'));
  document.getElementById('modal-pane-overview').classList.add('active');
  
  // Populate tabs
  populateModalTrims(model);
  populateModalSpecs(model);
  populateModalGallery(model);
  
  detailsModal.style.display = 'flex';
}

function closeModal() {
  detailsModal.style.display = 'none';
  selectedModelForModal = null;
}

modalClose.addEventListener('click', closeModal);
detailsModal.addEventListener('click', (e) => {
  if (e.target === detailsModal) closeModal();
});

// Modal Inner Tabs Handler
function initModalTabs() {
  modalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modalTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const paneId = btn.dataset.modaltab;
      modalPanes.forEach(pane => {
        pane.classList.remove('active');
        if (pane.id === `modal-pane-${paneId.replace('modal-', '')}`) {
          pane.classList.add('active');
        }
      });
    });
  });
}

function populateModalTrims(model) {
  modalTrimList.innerHTML = '';
  
  if (model.variants.length === 0) {
    modalTrimList.innerHTML = '<p>No variant trims found.</p>';
    return;
  }
  
  model.variants.forEach(v => {
    const item = document.createElement('div');
    item.className = 'trim-item';
    
    let priceText = v.price ? `₹${v.price.toLocaleString('en-IN')}` : 'Upcoming';
    let detailText = `${v.transmission} | ${v.fuel_type}`;
    if (v.fuel_type === 'Electric' && v.ev_specifications?.battery_capacity) {
      detailText += ` | ${v.ev_specifications.battery_capacity}`;
    } else if (v.engine_powertrain?.displacement) {
      detailText += ` | ${v.engine_powertrain.displacement} cc`;
    }
    
    item.innerHTML = `
      <div class="trim-info">
        <h5>${v.variant_name}</h5>
        <p>${detailText}</p>
      </div>
      <div class="trim-price">
        <span>${priceText}</span>
      </div>
    `;
    modalTrimList.appendChild(item);
  });
}

function populateModalSpecs(model) {
  modalSpecsGrid.innerHTML = '';
  
  const v = model.variants[0];
  if (!v) {
    modalSpecsGrid.innerHTML = '<p>No specifications available.</p>';
    return;
  }
  
  // Specifications loop
  v.productSpecifications.forEach(cat => {
    if (cat.specType === 'price') return; // Skip price category
    
    const block = document.createElement('div');
    block.className = 'spec-category-block';
    
    let tableHtml = `<table class="spec-category-table">`;
    cat.specList.forEach(spec => {
      tableHtml += `
        <tr>
          <td class="spec-label-col">${spec.specLabel}</td>
          <td class="spec-value-col">${spec.specValue || '-'}</td>
        </tr>
      `;
    });
    tableHtml += `</table>`;
    
    block.innerHTML = `
      <h4>${cat.specTypeTitle}</h4>
      ${tableHtml}
    `;
    
    modalSpecsGrid.appendChild(block);
  });
}

function populateModalGallery(model) {
  modalGalleryGrid.innerHTML = '';
  
  const images = new Set();
  model.variants.forEach(v => {
    v.media.exterior_image_urls.forEach(url => images.add(url));
  });
  
  if (images.size === 0) {
    modalGalleryGrid.innerHTML = '<p>No images available for this model.</p>';
    return;
  }
  
  images.forEach(url => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.addEventListener('click', () => {
      modalHeroImg.src = url;
      // Scroll to top overview section
      document.getElementById('modal-pane-overview').scrollIntoView({ behavior: 'smooth' });
      // Switch to overview tab
      modalTabBtns.forEach(btn => btn.classList.remove('active'));
      modalTabBtns[0].classList.add('active');
      modalPanes.forEach(pane => pane.classList.remove('active'));
      document.getElementById('modal-pane-overview').classList.add('active');
    });
    
    item.innerHTML = `<img src="${url}" alt="Car View" onerror="this.parentElement.style.display='none'">`;
    modalGalleryGrid.appendChild(item);
  });
}
