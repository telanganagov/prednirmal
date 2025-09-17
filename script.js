const GAS_URL="https://script.google.com/macros/s/AKfycbxQ7hqXe7ho1w0ZJ8xBfbsGHI0Jh14hffUAEafRcmLZgPsYjgHJfudVeJ5exTEeWhpJ9A/exec";
let currentGrant="";
let allRecords=[];
let activeFilters={};

function toggleForm(grant){
  const form=document.getElementById("reportForm");
  if(currentGrant===grant){form.classList.add("hidden"); currentGrant=""; document.querySelector("#responseTable tbody").innerHTML="";} 
  else{currentGrant=grant; form.classList.remove("hidden"); form.reset(); fetchRecords(grant);}
}

const form=document.getElementById("reportForm");
form.addEventListener("submit",e=>{
  e.preventDefault();
  const formData={};
  new FormData(form).forEach((v,k)=>formData[k]=v);
  formData.sheetName=currentGrant;
  if(form.dataset.editRowId){formData.rowId=form.dataset.editRowId; delete form.dataset.editRowId;}
  fetch(GAS_URL,{method:"POST",body:JSON.stringify(formData)})
  .then(r=>r.json()).then(d=>{if(d.success){form.reset(); fetchRecords(currentGrant);} else alert("Submit failed:"+d.message)})
  .catch(err=>console.error("Submit failed",err));
});

function fetchRecords(grant){
  fetch(`${GAS_URL}?sheetName=${grant}`).then(r=>r.json()).then(d=>{allRecords=d; applyFilters();}).catch(err=>console.error("Fetch failed",err));
}

function applyFilters(){
  let filtered=allRecords.filter(r=>Object.keys(activeFilters).every(f=>!activeFilters[f].length||activeFilters[f].includes(r[f])));
  renderTable(filtered);
}

function renderTable(records){
  const tbody=document.querySelector("#responseTable tbody"); tbody.innerHTML="";
  records.forEach(row=>{
    const tr=document.createElement("tr");
    Object.keys(row).forEach(k=>{if(k!=="rowId"){const td=document.createElement("td"); td.textContent=row[k]; tr.appendChild(td);}});
    const actionTd=document.createElement("td");
    const editBtn=document.createElement("button"); editBtn.textContent="Edit"; editBtn.className="action-btn edit"; editBtn.onclick=()=>editRecord(row);
    const delBtn=document.createElement("button"); delBtn.textContent="Delete"; delBtn.className="action-btn delete"; delBtn.onclick=()=>deleteRecord(row);
    actionTd.appendChild(editBtn); actionTd.appendChild(delBtn); tr.appendChild(actionTd);
    tbody.appendChild(tr);
  });
}

function editRecord(row){Object.keys(row).forEach(f=>{if(form[f]) form[f].value=row[f];}); form.dataset.editRowId=row.rowId;}
function deleteRecord(row){if(confirm("Delete this record?")){fetch(`${GAS_URL}?action=delete&sheetName=${currentGrant}&rowId=${row.rowId}`).then(r=>r.json()).then(()=>fetchRecords(currentGrant)).catch(err=>console.error("Delete failed",err));}}

function toggleFilter(field, btn){
  closeFilterPopups();
  const rect=btn.getBoundingClientRect();
  const popup=document.createElement("div"); popup.className="filter-popup";
  const unique=[...new Set(allRecords.map(r=>r[field]))].sort();
  const selected=activeFilters[field]||unique.slice();
  unique.forEach(val=>{
    const lbl=document.createElement("label");
    const cb=document.createElement("input");
    cb.type="checkbox"; cb.value=val; cb.checked=selected.includes(val);
    cb.onchange=()=>{if(!activeFilters[field]) activeFilters[field]=[]; if(cb.checked) activeFilters[field].push(val); else activeFilters[field]=activeFilters[field].filter(v=>v!==val);}
    lbl.appendChild(cb); lbl.append(" "+val); popup.appendChild(lbl);
  });
  const clearBtn=document.createElement("button"); clearBtn.textContent="Clear Filter"; clearBtn.onclick=()=>{activeFilters[field]=[]; applyFilters(); closeFilterPopups();};
  const applyBtn=document.createElement("button"); applyBtn.textContent="Apply"; applyBtn.onclick=()=>{if(!activeFilters[field]) activeFilters[field]=unique; applyFilters(); closeFilterPopups();};
  popup.appendChild(clearBtn); popup.appendChild(applyBtn);
  document.body.appendChild(popup);
  popup.style.left=rect.left+"px"; popup.style.top=(rect.bottom+window.scrollY)+"px";
}

function closeFilterPopups(){document.querySelectorAll(".filter-popup").forEach(el=>el.remove());}
document.addEventListener("click",e=>{if(!e.target.closest(".filter-popup")&&!e.target.closest(".filter-btn")) closeFilterPopups();});

document.getElementById("exportExcel").addEventListener("click",()=>{const table=document.getElementById("responseTable"); const wb=XLSX.utils.table_to_book(table,{sheet:"Responses"}); XLSX.writeFile(wb,"responses.xlsx");});
document.getElementById("exportPDF").addEventListener("click",()=>{const table=document.getElementById("responseTable"); const { jsPDF }=window.jspdf; const doc=new jsPDF('l','pt','a4'); doc.autoTable({ html: table, startY:20, theme:'grid' }); doc.save("responses.pdf");});