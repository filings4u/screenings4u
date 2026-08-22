/**
 * screenings4u - Post-Accident Testing Request Form
 * Handles service preselection, conditional vehicle fields,
 * CCF upload logic, collector instructions, validation and submission.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postAccidentForm');
  if (!form) return;

  populateStates();
  populateTestOptions();
  initializeSelectedService();
  initializeVehicleLogic();
  initializeConditionalFields();
  initializeSubmission();
});

const STATE_OPTIONS = [
  ['AL','AL'],['AK','AK'],['AZ','AZ'],['AR','AR'],['CA','CA'],['CO','CO'],
  ['CT','CT'],['DE','DE'],['DC','DC'],['FL','FL'],['GA','GA'],['HI','HI'],
  ['ID','ID'],['IL','IL'],['IN','IN'],['IA','IA'],['KS','KS'],['KY','KY'],
  ['LA','LA'],['ME','ME'],['MD','MD'],['MA','MA'],['MI','MI'],['MN','MN'],
  ['MS','MS'],['MO','MO'],['MT','MT'],['NE','NE'],['NV','NV'],['NH','NH'],
  ['NJ','NJ'],['NM','NM'],['NY','NY'],['NC','NC'],['ND','ND'],['OH','OH'],
  ['OK','OK'],['OR','OR'],['PA','PA'],['RI','RI'],['SC','SC'],['SD','SD'],
  ['TN','TN'],['TX','TX'],['UT','UT'],['VT','VT'],['VA','VA'],['WA','WA'],
  ['WV','WV'],['WI','WI'],['WY','WY']
];

const TEST_OPTIONS = [
  'DOT Post Accident (5 Panel)',
  'DOT Breathalyzer Test',
  'NON-DOT Breathalyzer Test',
  '5 Panel Hair Follicle Test',
  '5 Panel Hair Follicle (Exp Opi)',
  '7 Panel Hair Follicle Test',
  '9 Panel Hair Follicle Test',
  '12 Panel Hair Follicle Test',
  '14 Panel Hair Follicle Test',
  '17 Panel Hair Follicle Test',
  '4 Panel Drug Test',
  '5 Panel Drug Test',
  '5 Panel Drug Test Expanded Opiates',
  '10 Panel Drug Test (Lab)',
  '10 Panel Drug Test (Rapid)',
  '12 Panel Drug Test',
  '14 Panel Drug Test',
  '18 Panel Drug Test',
  'EtG + 5 Panel Drug Test',
  'EtG + 10 Panel Drug Test',
  'EtG Urine Alcohol Test',
  'EtG Alcohol Hair Test',
  '5 Panel Oral Test',
  '10 Panel Oral Test',
  '5 Panel Oral (Rapid)',
  '10 Panel Oral (Rapid)'
];

const SERVICE_MAP = {
  post_accident_drug_test: {
    label: 'DOT Post-Accident Drug Test',
    tests: ['DOT Post Accident (5 Panel)']
  },
  post_accident_alcohol_test: {
    label: 'DOT Post-Accident Alcohol Test',
    tests: ['DOT Breathalyzer Test']
  },
  post_accident_drug_alcohol: {
    label: 'Drug & Alcohol Package',
    tests: ['DOT Post Accident (5 Panel)', 'DOT Breathalyzer Test']
  }
};

function populateStates() {
  const select = document.getElementById('companyState');
  if (!select) return;

  STATE_OPTIONS.forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
}

function populateTestOptions() {
  const container = document.getElementById('testOptions');
  if (!container) return;

  TEST_OPTIONS.forEach((test, index) => {
    const id = `test_${index}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'option';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.name = 'test_options[]';
    input.value = test;

    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = test;

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  });
}

function initializeSelectedService() {
  const params = new URLSearchParams(window.location.search);
  const serviceKey = params.get('service');
  const service = SERVICE_MAP[serviceKey];
  const display = document.getElementById('selectedServiceDisplay');

  if (!service) {
    display.textContent = 'No specific service was preselected. Select the requested testing service below.';
    return;
  }

  display.textContent = `Selected service: ${service.label}`;

  service.tests.forEach((test) => {
    const checkbox = [...document.querySelectorAll('#testOptions input[type="checkbox"]')]
      .find((input) => input.value === test);

    if (checkbox) {
      checkbox.checked = true;
      checkbox.closest('.option').classList.add('selected');
    }
  });

  let hidden = document.querySelector('input[name="requested_service"]');
  if (!hidden) {
    hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = 'requested_service';
    document.getElementById('postAccidentForm').appendChild(hidden);
  }
  hidden.value = serviceKey;
}

function initializeVehicleLogic() {
  const radios = document.querySelectorAll('input[name="vehicle_type"]');

  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const type = radio.value.toLowerCase();
      showOnlyVehicle(type);
    });
  });
}

function showOnlyVehicle(type) {
  const sections = {
    car: document.getElementById('carFields'),
    truck: document.getElementById('truckFields'),
    bus: document.getElementById('busFields')
  };

  Object.entries(sections).forEach(([key, section]) => {
    if (!section) return;
    section.classList.toggle('hidden', key !== type);

    section.querySelectorAll('input').forEach((input) => {
      input.required = key === type && input.name !== 'truck_usdot' && input.name !== 'truck_mc'
        && input.name !== 'bus_usdot' && input.name !== 'bus_mc';
    });
  });
}

function initializeConditionalFields() {
  const ccfSelect = document.getElementById('ccfAltered');
  const instructionsSelect = document.getElementById('collectorInstructions');
  const uploadWrap = document.getElementById('ccfUploadWrap');
  const file = document.getElementById('ccfFile');
  const instructionsWrap = document.getElementById('instructionsWrap');

  ccfSelect.addEventListener('change', () => {
    const show = ccfSelect.value === 'Yes';
    uploadWrap.classList.toggle('hidden', !show);
    file.required = show;
    if (!show) file.value = '';
  });

  instructionsSelect.addEventListener('change', () => {
    const show = instructionsSelect.value === 'Yes';
    instructionsWrap.classList.toggle('hidden', !show);
  });
}

function initializeSubmission() {
  const form = document.getElementById('postAccidentForm');
  const status = document.getElementById('formStatus');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.className = 'status';
    status.textContent = '';

    if (!validateTestSelection()) {
      showStatus('Please select at least one testing service.', 'error');
      document.getElementById('testOptions').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);

    /*
      BACKEND HOOK:
      Replace this section with your Supabase insert/storage logic.
      The complete form data is available in formData.
    */

    console.log('Post-accident testing request:', Object.fromEntries(formData.entries()));

    showStatus(
      'Your post-accident testing request has been captured. A screenings4u specialist can review the information and coordinate the next step.',
      'success'
    );

    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function validateTestSelection() {
  return document.querySelectorAll('#testOptions input[type="checkbox"]:checked').length > 0;
}

function showStatus(message, type) {
  const status = document.getElementById('formStatus');
  status.textContent = message;
  status.className = `status ${type}`;
}