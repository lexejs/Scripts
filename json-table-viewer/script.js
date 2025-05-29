document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const headersRow = document.getElementById('headers');
  const tableBody = document.getElementById('tableBody');
  const otherDataDiv = document.getElementById('otherData');

  let dataForms = [];
  let sortColumn = null;
  let sortDir = 1;

  fileInput.addEventListener('change', handleFile);

  function handleFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const j = JSON.parse(reader.result);
        const items = j.forms || j.FormItems;
        if (!items) { alert('Invalid JSON: expected "forms" or "FormItems"'); clearOtherData(); return; }
        loadData(items);
        if (j.FormItems) showOtherData(j, ['FormItems']); else clearOtherData();
      } catch (err) { alert('Invalid JSON: '+err.message); clearOtherData(); }
    };
    reader.readAsText(f);
  }

  function loadData(forms) {
    dataForms = Array.isArray(forms) ? forms : [];
    sortColumn = null;
    render();
  }

  function render() {
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    if (!dataForms.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = keys.length + 1;
      td.textContent = 'No data';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    const keys = (dataForms[0].Key && dataForms[0].Value !== undefined && dataForms[0].ExtractedValue !== undefined)
      ? ['Key', 'RowIndex', 'Value', 'ExtractedValue']
      : Object.keys(dataForms[0]).filter(k => k !== 'fields');

    // headers
    const thIndex = document.createElement('th');
    thIndex.textContent = '#';
    headersRow.appendChild(thIndex);
    keys.forEach(k => {
      const th = document.createElement('th');
      // Display header with sort arrow if active
      th.textContent = k + (sortColumn === k ? (sortDir > 0 ? ' ↑' : ' ↓') : '');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sort(k));
      headersRow.appendChild(th);
    });

    // rows
    dataForms.forEach((item, i) => {
      const tr = document.createElement('tr');
      tr.insertCell().textContent = i+1;
      keys.forEach(k => {
        tr.insertCell().textContent = format(item[k]);
      });
      tableBody.appendChild(tr);
    });
  }

  function sort(col) {
    if (sortColumn === col) {
      sortDir = -sortDir;
    } else {
      sortColumn = col;
      sortDir = 1;
    }
    dataForms.sort((a,b) => (a[col] > b[col] ? 1 : -1) * sortDir);
    render();
  }

  function format(v) {
    if (v===null||v===undefined) return '';
    if (Array.isArray(v)) return v.length+' items';
    if (typeof v==='object') return JSON.stringify(v, null, 2);
    return v;
  }

  function showOtherData(obj, exclude) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv.innerHTML = '<h3>Additional Data</h3><pre>' + JSON.stringify(copy, null, 2) + '</pre>';
  }
  function clearOtherData() { otherDataDiv.innerHTML = ''; }

  // init: no initial load
});
