// ==========================================
// KONFIGURASI SUPABASE ANDA
// ==========================================
const SUPABASE_URL = 'https://rvhqwhezoxjeqwxegqrd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GGKAOy_A6E_PfxMiXrqVCg_ggUmXk1Q';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let globalData = [];

// Saat halaman dimuat
window.onload = function() {
  muatData();
  
  // Event listener untuk form submit
  document.getElementById('formTransaksi').addEventListener('submit', handleFormSubmit);
};

// 1. AMBIL DATA DARI SUPABASE
async function muatData() {
  const { data, error } = await db
    .from('transaksi')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error("Gagal meload data:", error.message);
    alert("Gagal terhubung ke database Supabase: " + error.message);
    return;
  }

  globalData = data || [];
  renderApp(globalData);
}

// 2. RENDER TAMPILAN APLIKASI
function renderApp(data) {
  const container = document.getElementById('cardContainer');
  const rekapContainer = document.getElementById('rekapWarungContainer');
  const emptyState = document.getElementById('emptyState');
  const jumlahData = document.getElementById('jumlahData');
  
  container.innerHTML = '';
  rekapContainer.innerHTML = '';
  jumlahData.innerText = `${data.length} catatan tersimpan`;

  if (data.length === 0) {
    emptyState.classList.remove('hidden');
    updateStatistik([]);
    rekapContainer.innerHTML = `<p class="text-xs text-stone-400 text-center py-4">Belum ada data rekap per warung.</p>`;
    return;
  }
  emptyState.classList.add('hidden');

  // Dapatkan daftar unik nama warung untuk datalist
  const uniqueWarung = [...new Set(data.map(item => item.warung))];
  document.getElementById('listWarung').innerHTML = uniqueWarung.map(w => `<option value="${w}">`).join('');

  // Hitung Rekap Per Warung
  const rekapMap = {};
  data.forEach(item => {
    const w = item.warung;
    if (!rekapMap[w]) {
      rekapMap[w] = { warung: w, totalTitipan: 0, totalTerjual: 0, sisaStokAktif: 0, totalPendapatan: 0 };
    }
    rekapMap[w].totalTitipan += Number(item.titipan_baru) || 0;
    rekapMap[w].totalTerjual += Number(item.terjual) || 0;
    rekapMap[w].totalPendapatan += Number(item.total_penjualan) || 0;
    rekapMap[w].sisaStokAktif = Number(item.sisa) || 0;
  });

  Object.values(rekapMap).forEach(rekap => {
    const rekapCard = document.createElement('div');
    rekapCard.className = 'bg-stone-50 border border-stone-200/80 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3';
    rekapCard.innerHTML = `
      <div>
        <h3 class="font-bold text-stone-800 text-sm sm:text-base">🏪 ${rekap.warung}</h3>
        <p class="text-xs text-stone-500 mt-0.5">
          Sisa Stok: <span class="font-semibold text-emerald-600">${rekap.sisaStokAktif} pcs</span> | 
          Terjual: <span class="font-semibold text-amber-600">${rekap.totalTerjual} pcs</span>
        </p>
      </div>
      <div class="text-right sm:text-right w-full sm:w-auto flex justify-between sm:block border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200">
        <span class="text-[10px] uppercase text-stone-400 block sm:hidden">Total Pendapatan</span>
        <span class="font-bold text-rose-600 text-sm sm:text-base">Rp ${rekap.totalPendapatan.toLocaleString('id-ID')}</span>
      </div>
    `;
    rekapContainer.appendChild(rekapCard);
  });

  // Render Riwayat (Urutan terbaru di atas)
  const reversed = [...data].reverse();
  reversed.forEach(row => {
    const card = document.createElement('div');
    card.className = 'bg-stone-50/60 border border-stone-100 p-4 rounded-2xl flex flex-col gap-2.5 relative';
    card.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] bg-stone-200/70 text-stone-600 font-semibold px-2 py-0.5 rounded-md">${row.tanggal}</span>
          <h4 class="font-bold text-stone-800 text-sm mt-1">${row.warung}</h4>
        </div>
        <button onclick="hapusBaris(${row.id})" class="text-stone-300 hover:text-rose-500 p-1 transition-colors cursor-pointer" title="Hapus">
          🗑️
        </button>
      </div>
      <div class="grid grid-cols-3 gap-2 bg-white border border-stone-200/60 p-2.5 rounded-xl text-center text-xs">
        <div>
          <span class="text-stone-400 block text-[10px]">Titipan Baru</span>
          <span class="font-bold text-sky-600">+${row.titipan_baru}</span>
        </div>
        <div>
          <span class="text-stone-400 block text-[10px]">Terjual</span>
          <span class="font-bold text-emerald-600">${row.terjual}</span>
        </div>
        <div>
          <span class="text-stone-400 block text-[10px]">Sisa Stok</span>
          <span class="font-bold text-amber-600">${row.sisa}</span>
        </div>
      </div>
      <div class="flex justify-between items-center text-xs pt-1">
        <span class="text-stone-400">Penjualan (Rp 5rb):</span>
        <span class="font-bold text-rose-600">Rp ${Number(row.total_penjualan).toLocaleString('id-ID')}</span>
      </div>
    `;
    container.appendChild(card);
  });

  updateStatistik(data);
}

// 3. UPDATE STATISTIK GLOBAL
function updateStatistik(data) {
  let totalPendapatan = 0;
  let totalTerjual = 0;
  const latestSisaMap = {};

  data.forEach(item => {
    totalPendapatan += Number(item.total_penjualan) || 0;
    totalTerjual += Number(item.terjual) || 0;
    latestSisaMap[item.warung] = Number(item.sisa) || 0;
  });

  let totalSisaStok = Object.values(latestSisaMap).reduce((a, b) => a + b, 0);

  document.getElementById('statPendapatan').innerText = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
  document.getElementById('statTerjual').innerText = `${totalTerjual} Pcs`;
  document.getElementById('statSisa').innerText = `${totalSisaStok} Pcs`;
}

// 4. SIMPAN TRANSAKSI BARU KE SUPABASE
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const warungInput = document.getElementById('warung').value.trim();
  const titipanBaru = parseInt(document.getElementById('titipanBaru').value) || 0;
  const terjual = parseInt(document.getElementById('terjual').value) || 0;
  const hargaPerBucket = 5000;

  const btn = document.getElementById('btnSimpan');
  const msg = document.getElementById('statusMsg');
  
  btn.disabled = true;
  btn.innerText = 'Menyimpan... ⏳';
  msg.innerText = '';

  // Cari sisa stok sebelumnya di warung yang sama dari data lokal yang ada
  let sisaSebelumnya = 0;
  const filteredWarung = globalData.filter(item => item.warung.toLowerCase() === warungInput.toLowerCase());
  if (filteredWarung.length > 0) {
    sisaSebelumnya = Number(filteredWarung[filteredWarung.length - 1].sisa) || 0;
  }

  const sisa = Math.max(0, (sisaSebelumnya + titipanBaru) - terjual);
  const totalPenjualan = terjual * hargaPerBucket;
  
  const now = new Date();
  const tanggalStr = now.toISOString().split('T')[0];

  const { error } = await db.from('transaksi').insert([
    {
      warung: warungInput,
      titipan_baru: titipanBaru,
      terjual: terjual,
      sisa: sisa,
      total_penjualan: totalPenjualan,
      tanggal: tanggalStr
    }
  ]);

  btn.disabled = false;
  btn.innerText = 'Simpan Transaksi ✨';

  if (error) {
    alert('Gagal menyimpan ke database: ' + error.message);
  } else {
    msg.innerText = 'Transaksi berhasil disimpan! 🎉';
    document.getElementById('formTransaksi').reset();
    muatData();
    setTimeout(() => { msg.innerText = ''; }, 3000);
  }
}

// 5. HAPUS BARIS DATA
async function hapusBaris(id) {
  if (confirm("Hapus catatan transaksi ini?")) {
    const { error } = await db.from('transaksi').delete().eq('id', id);
    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      muatData();
    }
  }
}

// 6. FILTER PENCARIAN WARUNG
function filterTabel() {
  const keyword = document.getElementById('searchWarung').value.toLowerCase();
  const filtered = globalData.filter(item => item.warung.toLowerCase().includes(keyword));
  renderApp(filtered);
}
