document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const fileInput2 = document.getElementById('fileInput2');
  const headersRow = document.getElementById('headers');
  const tableBody = document.getElementById('tableBody');
  const otherDataDiv1 = document.getElementById('otherData1');
  const otherDataDiv2 = document.getElementById('otherData2');
  let primaryData = null;
  let secondaryData = null;
  let mergedRows = [];
  let sortColumn = null;
  let sortDir = 1;
  let primaryForm = null;
  let secondaryForm = null;
  let compareFieldsRows = [];
  let showExtra = false;
  const toggleExtra = document.getElementById('toggleExtra');
  const toggleExtraDiv = document.querySelector('.toggle-extra');
  toggleExtra.addEventListener('change', () => {
    showExtra = toggleExtra.checked;
    // rerender based on current state
    if (secondaryData) compareAndRender(); else render();
  });

  fileInput.addEventListener('change', handlePrimary);
  fileInput2.addEventListener('change', handleSecondary);

  // drag-and-drop support for primary JSON
  const dropZone = document.getElementById('primaryDropZone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('hover'); });
  dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('hover'); });
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('hover');
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput.files = files;
      handlePrimary({ target: { files } });
    }
  });

  // drag-and-drop for secondary JSON
  const secondaryDropZone = document.getElementById('secondaryDropZone');
  secondaryDropZone.addEventListener('dragover', e => { e.preventDefault(); secondaryDropZone.classList.add('hover'); });
  secondaryDropZone.addEventListener('dragleave', () => { secondaryDropZone.classList.remove('hover'); });
  secondaryDropZone.addEventListener('drop', e => {
    e.preventDefault(); secondaryDropZone.classList.remove('hover');
    const files = e.dataTransfer.files;
    if (files.length) {
      fileInput2.files = files;
      handleSecondary({ target: { files } });
    }
  });

  function handlePrimary(e) {
    // show secondary drop zone when primary JSON loaded
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      secondaryDropZone.style.display = 'block';
      const j = JSON.parse(reader.result);
      let items, form;
      if (j.forms && Array.isArray(j.forms[0].fields)) {
        form = j.forms[0];
        items = form.fields;
      } else if (j.FormItems && Array.isArray(j.FormItems)) {
        form = j;
        items = j.FormItems;
      } else {
        return alert('Invalid JSON: expected "forms[0].fields" or "FormItems"');
      }
      primaryForm = form;
      primaryData = items.map(item => ({
        Key: item.Key || item.name || item.LayoutField || '',
        Value: item.Value || item.value || item.FormattedValue || item.ExtractedValue || '',
        LayoutField: item.LayoutField || item.scanCode || item.code || '',
        ExtractedValue: item.ExtractedValue || item.value || '',
        FormattedValue: item.FormattedValue || item.value || '',
        ErrorMessage: item.ErrorMessage || '',
        RowIndex: item.RowIndex || '',
        Description: item.Description || item.description || '',
        Code: item.Code || item.code || '',
        ScanCode: item.ScanCode || item.scanCode || ''
      }));
      showOtherData1(form, j.forms ? ['fields'] : ['FormItems'], f.name);
      otherDataDiv2.innerHTML = '';
      render();
    };
    reader.readAsText(f);
  }

  function handleSecondary(e) {
    // compare secondary JSON, similar mapping
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const j = JSON.parse(reader.result);
      let items, form;
      if (j.forms && Array.isArray(j.forms[0].fields)) {
        form = j.forms[0];
        items = form.fields;
      } else if (j.FormItems && Array.isArray(j.FormItems)) {
        form = j;
        items = j.FormItems;
      } else {
        return alert('Invalid JSON: expected "forms[0].fields" or "FormItems"');
      }
      secondaryForm = form;
      secondaryData = items.map(item => ({
        Key: item.Key || item.name || item.LayoutField || '',
        Value: item.Value || item.value || item.FormattedValue || item.ExtractedValue || '',
        LayoutField: item.LayoutField || item.scanCode || item.code || '',
        ExtractedValue: item.ExtractedValue || item.value || '',
        FormattedValue: item.FormattedValue || item.value || '',
        ErrorMessage: item.ErrorMessage || '',
        RowIndex: item.RowIndex || '',
        Description: item.Description || item.description || '',
        Code: item.Code || item.code || '',
        ScanCode: item.ScanCode || item.scanCode || ''
      }));
      showOtherData2(form, j.forms ? ['fields'] : ['FormItems'], f.name);
      compareAndRender();
    };
    reader.readAsText(f);
  }

  function compareAndRender() {
    const map1 = {};
    primaryData.forEach(item => { map1[item.Key] = item; });
    const map2 = {};
    secondaryData.forEach(item => { map2[item.Key] = item; });
    const allKeys = Array.from(new Set([...Object.keys(map1), ...Object.keys(map2)]));
    mergedRows = allKeys.map((key, idx) => {
      const a = map1[key] || {};
      const b = map2[key] || {};
      const base = {
        row: idx+1,
        Key: key,
        RowIndex1: a.RowIndex || '',
        Value1: a.Value || '',
        RowIndex2: b.RowIndex || '',
        Value2: b.Value || ''
      };
      if (showExtra) {
        return {
          ...base,
          LayoutField1: a.LayoutField || '',
          Description1: a.Description || '',
          Code1: a.Code || '',
          ScanCode1: a.ScanCode || '',
          ExtractedValue1: a.ExtractedValue || '',
          FormattedValue1: a.FormattedValue || '',
          ErrorMessage1: a.ErrorMessage || '',
          LayoutField2: b.LayoutField || '',
          Description2: b.Description || '',
          Code2: b.Code || '',
          ScanCode2: b.ScanCode || '',
          ExtractedValue2: b.ExtractedValue || '',
          FormattedValue2: b.FormattedValue || '',
          ErrorMessage2: b.ErrorMessage || ''
        };
      }
      return base;
    });
    // default sort: bring differing rows to top
    mergedRows.sort((a,b) => {
      const diffA = a.Value1 !== a.Value2;
      const diffB = b.Value1 !== b.Value2;
      if (diffA && !diffB) return -1;
      if (!diffA && diffB) return 1;
      return 0;
    });
    sortColumn = null;
    // update secondary toggle with diff count and background
    const diffSpan2 = document.getElementById('secondaryToggleDiff');
    if (diffSpan2) {
      const count = mergedRows.filter(r => r.Value1 !== r.Value2).length;
      diffSpan2.textContent = count + ' diffs';
      const toggle2 = diffSpan2.parentElement;
      if (count) toggle2.classList.add('diff-present'); else toggle2.classList.remove('diff-present');
    }
    renderMerged();
  }

  function renderMerged() {
    toggleExtraDiv.style.display = (mergedRows && mergedRows.length) ? 'flex' : 'none';
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    if (!mergedRows.length) return;
    let keys;
    if (showExtra) {
      keys = ['row','Key',
        'LayoutField1','Description1','Code1','ScanCode1','ExtractedValue1','FormattedValue1','ErrorMessage1','RowIndex1','Value1',
        'LayoutField2','Description2','Code2','ScanCode2','ExtractedValue2','FormattedValue2','ErrorMessage2','RowIndex2','Value2'
      ];
    } else {
      keys = ['row','Key','RowIndex1','Value1','RowIndex2','Value2'];
    }
    // filter out columns with no values (except row and Key)
    const displayKeys = keys.filter(k => ['row','Key'].includes(k) || mergedRows.some(r => r[k] !== '' && r[k] !== null && r[k] !== undefined));
    displayKeys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'): '');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sortMerged(k));
      headersRow.appendChild(th);
    });
    mergedRows.forEach(item => {
      const tr = document.createElement('tr');
      // highlight full row on difference
      if (item.Value1 !== item.Value2) tr.classList.add('diff-highlight');
      displayKeys.forEach(k => {
        const td = document.createElement('td');
        td.textContent = item[k];
        tr.appendChild(td);
      });
      tableBody.appendChild(tr);
    });
  }

  function sortMerged(col) {
    if (sortColumn===col) sortDir=-sortDir; else { sortColumn=col; sortDir=1; }
    mergedRows.sort((a,b) => (a[col] > b[col] ? 1 : -1) * sortDir);
    renderMerged();
  }

  function render() {
    toggleExtraDiv.style.display = (primaryData && primaryData.length) ? 'flex' : 'none';
    tableBody.innerHTML = '';
    headersRow.innerHTML = '';
    if (!primaryData || !primaryData.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'No data';
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    let keys;
    if (primaryData[0].Key !== undefined) {
      keys = showExtra
        ? ['Key','LayoutField','ExtractedValue','FormattedValue','ErrorMessage','RowIndex','Value']
        : ['Key','RowIndex','Value'];
    } else {
      keys = Object.keys(primaryData[0]).filter(k => k!=='fields');
    }

    const thIndex = document.createElement('th');
    thIndex.textContent = '#';
    headersRow.appendChild(thIndex);
    keys.forEach(k => {
      const th = document.createElement('th');
      th.textContent = k + (sortColumn===k?(sortDir>0?' ↑':' ↓'):'');
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => sort(k));
      headersRow.appendChild(th);
    });

    primaryData.forEach((item,i)=>{
      const tr = document.createElement('tr');
      tr.insertCell().textContent = i+1;
      keys.forEach(k => {
        tr.insertCell().textContent = format(item[k]);
      });
      tableBody.appendChild(tr);
    });
  }

  function sort(col) {
    if(sortColumn===col)sortDir=-sortDir;else{sortColumn=col;sortDir=1}
    primaryData.sort((a,b)=>(a[col]>b[col]?1:-1)*sortDir);
    render();
  }

  function format(v) {
    if (v===null||v===undefined) return '';
    if (Array.isArray(v)) return v.length+' items';
    if (typeof v==='object') return JSON.stringify(v, null, 2);
    return v;
  }

  function showOtherData1(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv1.innerHTML = '';
    const toggle = document.createElement('div');
    toggle.textContent = filename + ' (click to toggle file details)';
    toggle.classList.add('clickable-title');
    otherDataDiv1.appendChild(toggle);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(copy, null, 2);
    pre.style.display = 'none';
    otherDataDiv1.appendChild(pre);
    toggle.addEventListener('click', () => {
      pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
  }

  function showOtherData2(obj, exclude, filename) {
    const copy = { ...obj };
    exclude.forEach(k => delete copy[k]);
    otherDataDiv2.innerHTML = '';
    const toggle = document.createElement('div');
    toggle.id = 'secondaryToggle';
    toggle.classList.add('clickable-title');
    // filename and hint
    const label = document.createElement('span');
    label.textContent = filename + ' (click to toggle file details)';
    toggle.appendChild(label);
    // diff count placeholder
    const diffSpan = document.createElement('span');
    diffSpan.id = 'secondaryToggleDiff';
    toggle.appendChild(diffSpan);
    otherDataDiv2.appendChild(toggle);
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(copy, null, 2);
    pre.style.display = 'none';
    otherDataDiv2.appendChild(pre);
    toggle.addEventListener('click', () => {
      pre.style.display = pre.style.display === 'none' ? 'block' : 'none';
    });
  }

  function clearOtherData() { otherDataDiv1.innerHTML = ''; otherDataDiv2.innerHTML = ''; }

  // init: no initial load
});
