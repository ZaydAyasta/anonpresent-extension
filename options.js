const patternPhone = document.getElementById('patternPhone');
const patternEmail = document.getElementById('patternEmail');
const phoneReplacement = document.getElementById('phoneReplacement');
const emailReplacement = document.getElementById('emailReplacement');
const saveBtn = document.getElementById('saveBtn');
const exportBtn = document.getElementById('exportBtn');

chrome.storage.local.get(['globalPatterns'], (res) => {
  const p = res.globalPatterns || {
    phone: true,
    email: true,
    phoneReplacement: 'XXXXXXXX',
    emailReplacement: 'xxxxx@xxxxx'
  };
  patternPhone.checked = !!p.phone;
  patternEmail.checked = !!p.email;
  phoneReplacement.value = p.phoneReplacement || 'XXXXXXXX';
  emailReplacement.value = p.emailReplacement || 'xxxxx@xxxxx';
});

saveBtn.addEventListener('click', () => {
  const p = {
    phone: !!patternPhone.checked,
    email: !!patternEmail.checked,
    phoneReplacement: phoneReplacement.value || 'XXXXXXXX',
    emailReplacement: emailReplacement.value || 'xxxxx@xxxxx'
  };
  chrome.storage.local.set({ globalPatterns: p }, () => {
    alert('Guardado');
  });
});

exportBtn.addEventListener('click', () => {
  chrome.storage.local.get(null, (all) => {
    const dataStr = JSON.stringify(all, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'anonpresent-config.json';
    a.click();
    URL.revokeObjectURL(url);
  });
});