'use client';
import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { IconPlus, IconMinus, IconChevronLeft, IconEdit, IconTrash, IconImage, IconUpload, IconPackage, IconShoppingBag, IconAlertTriangle, IconCheck, IconSearch, IconReceipt } from './components/Icons';
import { getProducts, addProduct as dbAddProduct, updateProduct as dbUpdateProduct, deleteProduct as dbDeleteProduct, getSales, createSale } from './lib/db-client';

const AUTH_PASSWORD = 'kaynayonthebed';

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState('');

  const checkAuth = () => {
    if (typeof window === 'undefined') return false;
    const v = localStorage.getItem('kaoni_auth');
    if (v === 'yes') { setAuthed(true); return true; }
    return false;
  };

  useEffect(() => { checkAuth(); }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (authInput === AUTH_PASSWORD) {
      localStorage.setItem('kaoni_auth', 'yes');
      setAuthed(true);
      setAuthError('');
    } else {
      setAuthError('Password မှားနေပါတယ်');
    }
  };

  if (!authed) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <img src="/logo.jpg" alt="Logo" className="login-logo" />
          <h1>KAONI</h1>
          <p>Password ထည့်ပါ</p>
          <form onSubmit={handleLogin}>
            <input type="password" placeholder="Password" value={authInput} onChange={e=>setAuthInput(e.target.value)} autoFocus required />
            {authError && <span className="login-error">{authError}</span>}
            <button type="submit">ဝင်ရန်</button>
          </form>
        </div>
      </div>
    );
  }
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('products');
  const [view, setView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [detailProduct, setDetailProduct] = useState(null);
  const [form, setForm] = useState({ name:'', images:[], costPrice:'', sellingPrice:'', quantity:'1', extraCharge:'0', extraChargeNote:'', discount:'0', discountNote:'' });
  const [sellCart, setSellCart] = useState([]);
  const [sellSearch, setSellSearch] = useState('');
  const [sellView, setSellView] = useState('browse');
  const [invoiceData, setInvoiceData] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [sales, setSales] = useState([]);
  const [detailSale, setDetailSale] = useState(null);
  const invoiceRef = useRef(null);

  useEffect(() => { if(!checkAuth()) return; getProducts().then(d=>setProducts(d)).catch(()=>{}); }, []);
  useEffect(() => { if(tab==='history'&&checkAuth()) getSales().then(d=>setSales(d)).catch(()=>{}); }, [tab]);

  const saveProduct = async (action, payload) => {
    try {
      if (action === 'add') { await dbAddProduct(payload.product); }
      else if (action === 'update') { await dbUpdateProduct(payload.product.id, payload.product); }
      else if (action === 'delete') { await dbDeleteProduct(payload.id); }
    } catch(e) { console.error(e); }
  };
  const refreshProducts = async () => { try { const d = await getProducts(); setProducts(d); } catch(e){} };
  const fmt = (num) => Number(num).toLocaleString('en-US');

  const summary = products.reduce((a,p)=>({
    items:a.items+p.quantity,
    cost:a.cost+p.costPrice*p.quantity,
    selling:a.selling+p.sellingPrice*p.quantity,
    profit:a.profit+(p.sellingPrice-p.costPrice)*p.quantity,
    extraCharge:a.extraCharge+(p.extraCharge||0)*p.quantity,
    discount:a.discount+(p.discount||0)*p.quantity,
  }),{items:0,cost:0,selling:0,profit:0,extraCharge:0,discount:0});
  const summaryTotal = summary.profit + summary.extraCharge - summary.discount;

  const openAdd = () => { setEditingId(null); setForm({name:'',images:[],costPrice:'',sellingPrice:'',quantity:'1',extraCharge:'0',extraChargeNote:'',discount:'0',discountNote:''}); setView('add'); };
  const openEdit = (p) => { setEditingId(p.id); setForm({name:p.name,images:p.images||[],costPrice:String(p.costPrice),sellingPrice:String(p.sellingPrice),quantity:String(p.quantity),extraCharge:String(p.extraCharge||0),extraChargeNote:p.extraChargeNote||'',discount:String(p.discount||0),discountNote:p.discountNote||''}); setView('edit'); };
  const goBack = () => { setView('list'); setEditingId(null); setDetailProduct(null); setDetailSale(null); };

  const handleImageFile = (e) => { Array.from(e.target.files).forEach(f=>{const r=new FileReader();r.onload=()=>setForm(x=>({...x,images:[...x.images,r.result]}));r.readAsDataURL(f);}); e.target.value=''; };
  const addImageUrl = (url) => { if(url.trim()) setForm(f=>({...f,images:[...f.images,url.trim()]})); };
  const removeImage = (idx) => { setForm(f=>({...f,images:f.images.filter((_,i)=>i!==idx)})); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const d = { name:form.name.trim(), images:form.images, costPrice:parseFloat(form.costPrice)||0, sellingPrice:parseFloat(form.sellingPrice)||0, quantity:parseInt(form.quantity)||1, extraCharge:parseFloat(form.extraCharge)||0, extraChargeNote:form.extraChargeNote.trim(), discount:parseFloat(form.discount)||0, discountNote:form.discountNote.trim() };
    if(editingId){await saveProduct('update',{product:{id:editingId,...d}})}else{await saveProduct('add',{product:d})}
    await refreshProducts(); setView('list'); setEditingId(null);
  };
  const changeQty = async (id,delta) => { const p=products.find(x=>x.id===id); if(!p)return; const nq=Math.max(0,p.quantity+delta); setProducts(prev=>prev.map(x=>x.id===id?{...x,quantity:nq}:x)); await saveProduct('update',{product:{id,quantity:nq}}); };
  const confirmDelete = async () => { await saveProduct('delete',{id:deletingId}); setProducts(prev=>prev.filter(p=>p.id!==deletingId)); setShowDelete(false); setDeletingId(null); if(detailProduct&&detailProduct.id===deletingId){setDetailProduct(null);setView('list');} };

  const addToCart = (product) => { setSellCart(prev=>{const ex=prev.find(c=>c.id===product.id);if(ex){if(ex.sellQty>=product.quantity)return prev;return prev.map(c=>c.id===product.id?{...c,sellQty:c.sellQty+1}:c)}return[...prev,{...product,sellQty:1}]}); };
  const removeFromCart = (id) => { setSellCart(prev=>prev.filter(c=>c.id!==id)); };
  const changeCartQty = (id,delta) => { setSellCart(prev=>prev.map(c=>{if(c.id!==id)return c;const nq=c.sellQty+delta;if(nq<=0)return null;const p=products.find(x=>x.id===id);if(p&&nq>p.quantity)return c;return{...c,sellQty:nq}}).filter(Boolean)); };

  const generateInvoice = () => {
    const items=sellCart.map(i=>({id:i.id,name:i.name,sellingPrice:i.sellingPrice,costPrice:i.costPrice,sellQty:i.sellQty,images:i.images,extraCharge:i.extraCharge||0,discount:i.discount||0}));
    const subtotal=sellCart.reduce((a,c)=>a+c.sellingPrice*c.sellQty,0);
    const totalExtra=sellCart.reduce((a,c)=>a+(c.extraCharge||0)*c.sellQty,0);
    const totalDiscount=sellCart.reduce((a,c)=>a+(c.discount||0)*c.sellQty,0);
    const totalAmount=subtotal+totalExtra-totalDiscount;
    const totalProfit=sellCart.reduce((a,c)=>a+(c.sellingPrice-c.costPrice+(c.extraCharge||0)-(c.discount||0))*c.sellQty,0);
    const totalItems=sellCart.reduce((a,c)=>a+c.sellQty,0);
    setInvoiceData({items,subtotal,totalExtra,totalDiscount,totalAmount,totalProfit,totalItems,date:new Date().toLocaleString('en-US',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})});
    setSellView('invoice');
  };

  const confirmSale = async () => {
    if(invoiceRef.current){try{const url=await toPng(invoiceRef.current,{quality:1,pixelRatio:3,backgroundColor:'#ffffff'});const a=document.createElement('a');a.download=`invoice-${Date.now()}.png`;a.href=url;a.click();}catch(e){console.log(e)}}
    try{await createSale({items:invoiceData.items,totalAmount:invoiceData.totalAmount,totalProfit:invoiceData.totalProfit,totalExtra:invoiceData.totalExtra,totalDiscount:invoiceData.totalDiscount,totalItems:invoiceData.totalItems,buyerName:customerName.trim()||''});await refreshProducts();setSellCart([]);setInvoiceData(null);setCustomerName('');setSellView('browse');}catch(e){console.error(e)}
  };
  const cancelSale = () => { setInvoiceData(null); setSellView('checkout'); };

  const cartTotal=sellCart.reduce((a,c)=>a+(c.sellingPrice+(c.extraCharge||0)-(c.discount||0))*c.sellQty,0);
  const cartProfit=sellCart.reduce((a,c)=>a+(c.sellingPrice-c.costPrice+(c.extraCharge||0)-(c.discount||0))*c.sellQty,0);
  const filteredProducts=products.filter(p=>p.name.toLowerCase().includes(sellSearch.toLowerCase()));
  const profitPreview=(parseFloat(form.sellingPrice)||0)-(parseFloat(form.costPrice)||0);
  const extraPreview=parseFloat(form.extraCharge)||0;
  const discountPreview=parseFloat(form.discount)||0;
  const netPreview=profitPreview+extraPreview-discountPreview;
  const qty=parseInt(form.quantity)||0;
  const totalProfitPreview=profitPreview*qty;
  const totalExtraPreview=extraPreview*qty;
  const totalDiscountPreview=discountPreview*qty;
  const totalNetPreview=netPreview*qty;

  // ==================== PRODUCT DETAIL ====================
  if (view === 'detail' && detailProduct) {
    const p = detailProduct;
    const profit = p.sellingPrice - p.costPrice;
    const extra = p.extraCharge || 0;
    const disc = p.discount || 0;
    const netProfit = profit + extra - disc;
    const totalProfit = profit * p.quantity;
    const totalExtra = extra * p.quantity;
    const totalDisc = disc * p.quantity;
    const totalNet = netProfit * p.quantity;
    return (
      <div className="screen">
        <div className="top-bar"><button className="btn-back" onClick={goBack}><IconChevronLeft size={20} strokeWidth={2.5}/></button><h1 className="top-bar-title">အသေးစိတ်</h1><div className="top-bar-spacer"/></div>
        <div className="screen-content">
          {p.images&&p.images.length>0?(
            <div className="detail-images"><div className="image-scroll large">{p.images.map((img,i)=>(<div className="detail-image-item" key={i}><img src={img} alt={p.name}/></div>))}</div></div>
          ):(<div className="detail-no-image"><IconImage size={40} strokeWidth={1.2}/></div>)}
          <div className="detail-info">
            <h2 className="detail-name">{p.name}</h2>
            <div className="detail-prices">
              <div className="detail-price-item"><span className="detail-price-label">မူရင်းဈေး</span><span className="detail-price-value">{fmt(p.costPrice)} Ks</span></div>
              <div className="detail-price-item"><span className="detail-price-label">ရောင်းဈေး</span><span className="detail-price-value">{fmt(p.sellingPrice)} Ks</span></div>
              <div className="detail-price-item"><span className="detail-price-label">အမြတ် (တစ်ခု)</span><span className={`detail-price-value ${profit>=0?'green':'red'}`}>{profit>=0?'+':''}{fmt(profit)} Ks</span></div>
              {extra>0&&<div className="detail-price-item"><span className="detail-price-label">အပိုကောက်ခံ {p.extraChargeNote?`(${p.extraChargeNote})`:''}</span><span className="detail-price-value green">+{fmt(extra)} Ks</span></div>}
              {disc>0&&<div className="detail-price-item"><span className="detail-price-label">အလျှော့ {p.discountNote?`(${p.discountNote})`:''}</span><span className="detail-price-value red">-{fmt(disc)} Ks</span></div>}
              <div className="detail-price-item highlight-row"><span className="detail-price-label">အသားတင် (တစ်ခု)</span><span className={`detail-price-value ${netProfit>=0?'green':'red'}`}>{netProfit>=0?'+':''}{fmt(netProfit)} Ks</span></div>
            </div>
            <div className="detail-qty-section"><span className="detail-qty-label">အရေအတွက်</span><div className="qty-controls"><button className="qty-btn" onClick={()=>{changeQty(p.id,-1);setDetailProduct({...p,quantity:Math.max(0,p.quantity-1)})}}><IconMinus size={14} strokeWidth={2.5}/></button><span className="qty-value">{p.quantity}</span><button className="qty-btn" onClick={()=>{changeQty(p.id,1);setDetailProduct({...p,quantity:p.quantity+1})}}><IconPlus size={14} strokeWidth={2.5}/></button></div></div>
            <div className="detail-totals-card">
              <div className="detail-totals-row"><span>အမြတ် ({p.quantity} ခု)</span><span className={profit>=0?'green':'red'}>{totalProfit>=0?'+':''}{fmt(totalProfit)} Ks</span></div>
              {totalExtra>0&&<div className="detail-totals-row"><span>အပိုကောက်ခံ</span><span className="green">+{fmt(totalExtra)} Ks</span></div>}
              {totalDisc>0&&<div className="detail-totals-row"><span>အလျှော့</span><span className="red">-{fmt(totalDisc)} Ks</span></div>}
              <div className="detail-totals-row total"><span>စုစုပေါင်း</span><span className={totalNet>=0?'green':'red'}>{totalNet>=0?'+':''}{fmt(totalNet)} Ks</span></div>
            </div>
            <div className="detail-actions"><button className="btn-detail-edit" onClick={()=>openEdit(p)}><IconEdit size={16} strokeWidth={2}/>ပြင်ဆင်</button><button className="btn-detail-delete" onClick={()=>{setDeletingId(p.id);setShowDelete(true);}}><IconTrash size={16} strokeWidth={2}/>ဖျက်</button></div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ADD / EDIT ====================
  if (view === 'add' || view === 'edit') {
    return (
      <div className="screen">
        <div className="top-bar"><button className="btn-back" onClick={goBack}><IconChevronLeft size={20} strokeWidth={2.5}/></button><h1 className="top-bar-title">{view==='edit'?'ပြင်ဆင်ရန်':'ပစ္စည်းအသစ်'}</h1><div className="top-bar-spacer"/></div>
        <div className="screen-content">
          <div className="image-gallery">
            {form.images.length>0?(<div className="image-scroll">{form.images.map((img,idx)=>(<div className="image-thumb" key={idx}><img src={img} alt=""/><button type="button" className="btn-remove-image" onClick={()=>removeImage(idx)}><IconMinus size={12} strokeWidth={3}/></button></div>))}<label className="image-add-btn"><IconPlus size={22} strokeWidth={1.8}/><input type="file" accept="image/*" multiple onChange={handleImageFile} hidden/></label></div>):(<label className="image-upload-area"><div className="upload-placeholder"><IconUpload size={28} strokeWidth={1.5}/><p>ပုံထည့်ရန်</p></div><input type="file" accept="image/*" multiple onChange={handleImageFile} hidden/></label>)}
          </div>
          <form onSubmit={handleSubmit} className="product-form">
            <div className="form-section"><div className="form-section-title">အခြေခံ</div>
              <div className="form-group"><label>ပစ္စည်းအမည်</label><input type="text" placeholder="ဥပမာ - ပိုးထည် လုံချည်" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required autoFocus/></div>
              <div className="form-group"><label>ပုံ URL</label><div className="url-input-row"><input type="text" placeholder="https://..." id="imageUrlInput" onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addImageUrl(e.target.value);e.target.value='';}}} /><button type="button" className="btn-url-add" onClick={()=>{const i=document.getElementById('imageUrlInput');addImageUrl(i.value);i.value='';}}><IconPlus size={16} strokeWidth={2.5}/></button></div></div>
            </div>
            <div className="form-section"><div className="form-section-title">ဈေးနှုန်း</div>
              <div className="form-row"><div className="form-group"><label>မူရင်းဈေး (Ks)</label><input type="number" placeholder="0" value={form.costPrice} onChange={e=>setForm({...form,costPrice:e.target.value})} required/></div><div className="form-group"><label>ရောင်းဈေး (Ks)</label><input type="number" placeholder="0" value={form.sellingPrice} onChange={e=>setForm({...form,sellingPrice:e.target.value})} required/></div></div>
              <div className="form-group"><label>အရေအတွက်</label><input type="number" placeholder="1" min="0" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} required/></div>
            </div>
            <div className="form-section"><div className="form-section-title">အပိုကောက်ခံ / အလျှော့</div>
              <div className="form-row"><div className="form-group"><label>အပိုကောက်ခံ (Ks)</label><input type="number" placeholder="0" value={form.extraCharge} onChange={e=>setForm({...form,extraCharge:e.target.value})}/></div><div className="form-group"><label>မှတ်ချက် (cargo...)</label><input type="text" placeholder="ဥပမာ - cargo" value={form.extraChargeNote} onChange={e=>setForm({...form,extraChargeNote:e.target.value})}/></div></div>
              <div className="form-row"><div className="form-group"><label>အလျှော့/အနှုတ် (Ks)</label><input type="number" placeholder="0" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}/></div><div className="form-group"><label>မှတ်ချက် (အကြောင်း)</label><input type="text" placeholder="ဥပမာ - အလျှော့" value={form.discountNote} onChange={e=>setForm({...form,discountNote:e.target.value})}/></div></div>
            </div>
            <div className={`profit-card ${netPreview<0?'loss':''}`}>
              <div className="profit-breakdown">
                <div className="profit-breakdown-row"><span>အမြတ်</span><span className={profitPreview>=0?'green':'red'}>{profitPreview>=0?'+':''}{fmt(profitPreview)} Ks</span></div>
                {extraPreview>0&&<div className="profit-breakdown-row"><span>အပိုကောက်ခံ</span><span className="green">+{fmt(extraPreview)} Ks</span></div>}
                {discountPreview>0&&<div className="profit-breakdown-row"><span>အလျှော့</span><span className="red">-{fmt(discountPreview)} Ks</span></div>}
                <div className="profit-breakdown-total"><span>အသားတင် (တစ်ခု)</span><span>{netPreview>=0?'+':''}{fmt(netPreview)} Ks</span></div>
              </div>
              {qty>1&&(
                <div className="profit-breakdown-grand">
                  <div className="profit-breakdown-row"><span>အမြတ် × {qty}</span><span>{totalProfitPreview>=0?'+':''}{fmt(totalProfitPreview)} Ks</span></div>
                  {totalExtraPreview>0&&<div className="profit-breakdown-row"><span>အပိုကောက်ခံ × {qty}</span><span className="green">+{fmt(totalExtraPreview)} Ks</span></div>}
                  {totalDiscountPreview>0&&<div className="profit-breakdown-row"><span>အလျှော့ × {qty}</span><span className="red">-{fmt(totalDiscountPreview)} Ks</span></div>}
                  <div className="profit-breakdown-total"><span>စုစုပေါင်း</span><span>{totalNetPreview>=0?'+':''}{fmt(totalNetPreview)} Ks</span></div>
                </div>
              )}
            </div>
            <button type="submit" className="btn-submit">{view==='edit'?'ပြင်ဆင်မည်':'သိမ်းမည်'}</button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== SALE DETAIL ====================
  if (view === 'saleDetail' && detailSale) {
    const s = detailSale;
    return (
      <div className="screen">
        <div className="top-bar"><button className="btn-back" onClick={goBack}><IconChevronLeft size={20} strokeWidth={2.5}/></button><h1 className="top-bar-title">မှတ်တမ်း #{s.id}</h1><div className="top-bar-spacer"/></div>
        <div className="screen-content">
          <div className="sale-detail-header">
            <p className="sale-detail-date">{new Date(s.createdAt).toLocaleString('en-US',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
            {s.buyerName&&<p className="sale-detail-customer">{s.buyerName}</p>}
          </div>
          <div className="sale-detail-items">
            {s.items.map((item,idx)=>(
              <div className="sale-detail-item" key={idx}>
                <div className="sale-detail-item-image">{item.images&&item.images.length>0?<img src={item.images[0]} alt={item.name}/>:<div className="placeholder-icon"><IconImage size={18} strokeWidth={1.5}/></div>}</div>
                <div className="sale-detail-item-info"><span className="sale-detail-item-name">{item.name}</span><span className="sale-detail-item-meta">{fmt(item.sellingPrice)} Ks × {item.sellQty}</span></div>
                <span className="sale-detail-item-total">{fmt(item.sellingPrice*item.sellQty)} Ks</span>
              </div>
            ))}
          </div>
          <div className="sale-detail-summary">
            <div className="sale-detail-row"><span>ပစ္စည်း</span><span>{s.totalItems} ခု ({s.items.length} မျိုး)</span></div>
            <div className="sale-detail-row"><span>အမြတ်</span><span className="green">+{fmt(s.totalProfit)} Ks</span></div>
            {s.totalExtra>0&&<div className="sale-detail-row"><span>အပိုကောက်ခံ</span><span className="green">+{fmt(s.totalExtra)} Ks</span></div>}
            {s.totalDiscount>0&&<div className="sale-detail-row"><span>အလျှော့</span><span className="red">-{fmt(s.totalDiscount)} Ks</span></div>}
            <div className="sale-detail-row large"><span>စုစုပေါင်း</span><span>{fmt(s.totalAmount)} Ks</span></div>
            <div className="sale-detail-row total-net"><span>အသားတင်</span><span>{fmt(s.totalProfit+(s.totalExtra||0)-(s.totalDiscount||0))} Ks</span></div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN ====================
  return (
    <div className="screen">
      <div className="top-bar"><div className="top-bar-spacer"/><h1 className="top-bar-title">{tab==='products'?'ပစ္စည်းများ':tab==='sell'?'ရောင်းမည်':'မှတ်တမ်း'}</h1><div className="top-bar-spacer"/></div>
      <div className="screen-content">

        {tab==='products'&&(<>
          <div className="summary-bar">
            <div className="summary-item"><span className="summary-label">ပစ္စည်း</span><span className="summary-value">{fmt(summary.items)}</span></div>
            <div className="summary-item"><span className="summary-label">အမြတ်</span><span className="summary-value">{fmt(summary.profit)} Ks</span></div>
            <div className="summary-item"><span className="summary-label">အပိုကောက်ခံ</span><span className="summary-value green">+{fmt(summary.extraCharge)} Ks</span></div>
            <div className="summary-item"><span className="summary-label">အလျှော့</span><span className="summary-value red">-{fmt(summary.discount)} Ks</span></div>
            <div className="summary-item highlight"><span className="summary-label">စုစုပေါင်း</span><span className="summary-value">{fmt(summaryTotal)} Ks</span></div>
          </div>
          <button className="btn-add" onClick={openAdd}><IconPlus size={18} strokeWidth={2.5}/>ပစ္စည်းအသစ်</button>
          <div className="product-list">
            {products.length===0?(<div className="empty-state"><div className="empty-icon"><IconPackage size={24} strokeWidth={1.5}/></div><p>ပစ္စည်းမရှိသေးပါ</p></div>):
            products.map(product=>{const profit=product.sellingPrice-product.costPrice+(product.extraCharge||0)-(product.discount||0);const cls=profit>=0?'profit':'loss';return(
              <div className="product-card" key={product.id} onClick={()=>{setDetailProduct(product);setView('detail');}}>
                <div className="product-top">
                  <div className="product-image">{product.images?.length>0?<img src={product.images[0]} alt={product.name}/>:null}<div className="placeholder-icon" style={{display:product.images?.length>0?'none':'flex'}}><IconImage size={24} strokeWidth={1.5}/></div>{product.images&&product.images.length>1&&<span className="image-count">{product.images.length}</span>}</div>
                  <div className="product-details"><h3 className="product-name">{product.name}</h3><div className="price-info"><div className="price-row"><span className="label">ရောင်းဈေး</span><span className="value">{fmt(product.sellingPrice)} Ks</span></div><div className={`price-row ${cls}`}><span className="label">အမြတ်</span><span className="value">{profit>=0?'+':''}{fmt(profit)} Ks</span></div></div><span className="product-qty-badge">{product.quantity} ခု</span></div>
                </div>
              </div>
            )})}
          </div>
        </>)}

        {tab==='sell'&&sellView==='browse'&&(<>
          <div className="search-bar"><IconSearch size={18} strokeWidth={2}/><input type="text" placeholder="ပစ္စည်းရှာရန်..." value={sellSearch} onChange={e=>setSellSearch(e.target.value)}/></div>
          <div className="sell-product-list">
            {filteredProducts.filter(p=>p.quantity>0).length===0?(<div className="empty-state small"><p>ရောင်းနိုင်သော ပစ္စည်းမရှိပါ</p></div>):
            filteredProducts.filter(p=>p.quantity>0).map(product=>{const inCart=sellCart.find(c=>c.id===product.id);return(
              <div className="sell-item" key={product.id}>
                <div className="sell-item-image">{product.images?.length>0?<img src={product.images[0]} alt={product.name}/>:<div className="placeholder-icon"><IconImage size={20} strokeWidth={1.5}/></div>}</div>
                <div className="sell-item-info"><span className="sell-item-name">{product.name}</span><span className="sell-item-price">{fmt(product.sellingPrice+(product.extraCharge||0)-(product.discount||0))} Ks</span><span className="sell-item-stock">လက်ကျန် {product.quantity}</span></div>
                {inCart?(<div className="sell-item-qty"><button className="qty-btn sm" onClick={()=>changeCartQty(product.id,-1)}><IconMinus size={12} strokeWidth={2.5}/></button><span className="cart-qty">{inCart.sellQty}</span><button className="qty-btn sm" onClick={()=>addToCart(product)} disabled={inCart.sellQty>=product.quantity}><IconPlus size={12} strokeWidth={2.5}/></button></div>):(<button className="btn-sell-add" onClick={()=>addToCart(product)}><IconPlus size={16} strokeWidth={2.5}/></button>)}
              </div>
            )})}
          </div>
          {sellCart.length>0&&(<div className="floating-cart" onClick={()=>setSellView('checkout')}><div className="floating-cart-left"><IconShoppingBag size={18} strokeWidth={2}/><span>{sellCart.reduce((a,c)=>a+c.sellQty,0)} ခု</span></div><div className="floating-cart-right"><span>{fmt(cartTotal)} Ks</span><IconChevronLeft size={16} strokeWidth={2.5} style={{transform:'rotate(180deg)'}}/></div></div>)}
        </>)}

        {tab==='sell'&&sellView==='checkout'&&(
          <div className="checkout-screen">
            <div className="checkout-header"><button className="btn-back-checkout" onClick={()=>setSellView('browse')}><IconChevronLeft size={18} strokeWidth={2.5}/><span>ထပ်ထည့်</span></button><span className="checkout-title">Cart</span></div>
            <div className="checkout-items">{sellCart.map(item=>{const unitPrice=item.sellingPrice+(item.extraCharge||0)-(item.discount||0);const it=unitPrice*item.sellQty;return(
              <div className="checkout-item" key={item.id}>
                <div className="checkout-item-top"><div className="checkout-item-image">{item.images?.length>0?<img src={item.images[0]} alt={item.name}/>:<div className="placeholder-icon"><IconImage size={16} strokeWidth={1.5}/></div>}</div><div className="checkout-item-info"><span className="checkout-item-name">{item.name}</span><span className="checkout-item-price">{fmt(unitPrice)} × {item.sellQty}</span></div><span className="checkout-item-total">{fmt(it)} Ks</span></div>
                <div className="checkout-item-bottom"><div className="qty-controls"><button className="qty-btn sm" onClick={()=>changeCartQty(item.id,-1)}><IconMinus size={12} strokeWidth={2.5}/></button><span className="cart-qty">{item.sellQty}</span><button className="qty-btn sm" onClick={()=>{const p=products.find(x=>x.id===item.id);if(p&&item.sellQty<p.quantity)changeCartQty(item.id,1);}}><IconPlus size={12} strokeWidth={2.5}/></button></div><button className="btn-cart-remove" onClick={()=>removeFromCart(item.id)}><IconTrash size={14} strokeWidth={2}/></button></div>
              </div>
            )})}</div>
            <div className="checkout-summary"><div className="checkout-summary-row"><span>ပစ္စည်း</span><span>{sellCart.length} မျိုး ({sellCart.reduce((a,c)=>a+c.sellQty,0)} ခု)</span></div><div className="checkout-summary-divider"/><div className="checkout-summary-row large"><span>စုစုပေါင်း</span><span>{fmt(cartTotal)} Ks</span></div><div className="checkout-summary-row profit"><span>အမြတ်</span><span>+{fmt(cartProfit)} Ks</span></div></div>
            <button className="btn-complete-sale" onClick={generateInvoice}><IconReceipt size={18} strokeWidth={2}/>Invoice ထုတ်ရန်</button>
          </div>
        )}

        {tab==='sell'&&sellView==='invoice'&&invoiceData&&(
          <div className="invoice-screen">
            <div className="form-group" style={{marginBottom:14}}><label>Customer Name (optional)</label><input type="text" placeholder="Name for invoice" value={customerName} onChange={e=>setCustomerName(e.target.value)}/></div>
            <div className="invoice-card" ref={invoiceRef}>
              <div className="invoice-header-section">
                <img src="/logo.jpg" alt="Logo" className="invoice-logo-img"/>
                <p className="invoice-date">{invoiceData.date}</p>
                {customerName.trim()&&<p className="invoice-customer-name">{customerName.trim()}</p>}
              </div>
              <div className="invoice-items">{invoiceData.items.map((item,idx)=>(<div className="invoice-item" key={idx}><div className="invoice-item-left"><span className="invoice-item-name">{item.name}</span><span className="invoice-item-detail">{fmt(item.sellingPrice+(item.extraCharge||0)-(item.discount||0))} Ks × {item.sellQty}</span></div><span className="invoice-item-amount">{fmt((item.sellingPrice+(item.extraCharge||0)-(item.discount||0))*item.sellQty)} Ks</span></div>))}</div>
              <div className="invoice-totals">
                {invoiceData.totalExtra>0&&<div className="invoice-total-row"><span>အပိုကောက်ခံ</span><span>+{fmt(invoiceData.totalExtra)} Ks</span></div>}
                {invoiceData.totalDiscount>0&&<div className="invoice-total-row"><span>အလျှော့</span><span>-{fmt(invoiceData.totalDiscount)} Ks</span></div>}
                <div className="invoice-total-row large"><span>Total</span><span>{fmt(invoiceData.totalAmount)} Ks</span></div>
              </div>
              <div className="invoice-footer">Thank you</div>
            </div>
            <div className="invoice-actions"><button className="btn-confirm-sale" onClick={confirmSale}><IconCheck size={18} strokeWidth={2.5}/>Confirm & Download</button><button className="btn-cancel-sale" onClick={cancelSale}>Back to Cart</button></div>
          </div>
        )}

        {tab==='history'&&(<>
          {sales.length===0?(<div className="empty-state"><div className="empty-icon"><IconReceipt size={24} strokeWidth={1.5}/></div><p>မှတ်တမ်းမရှိသေးပါ</p></div>):(
            <div className="sales-list">{sales.map(sale=>(<div className="sale-card" key={sale.id} onClick={()=>{setDetailSale(sale);setView('saleDetail');}}>
              <div className="sale-card-top"><span className="sale-card-date">{new Date(sale.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><span className="sale-card-amount">{fmt(sale.totalAmount)} Ks</span></div>
              <div className="sale-card-bottom">
                <span className="sale-card-items">{sale.totalItems} ခု</span>
                <div className="sale-card-breakdown">
                  <span className="sale-card-profit">+{fmt(sale.totalProfit)}</span>
                  {sale.totalExtra>0&&<span className="sale-card-extra">+{fmt(sale.totalExtra)}</span>}
                  {sale.totalDiscount>0&&<span className="sale-card-discount">-{fmt(sale.totalDiscount)}</span>}
                </div>
              </div>
              {sale.buyerName&&<div className="sale-card-buyer">{sale.buyerName}</div>}
            </div>))}</div>
          )}
        </>)}
      </div>

      <nav className="bottom-nav">
        <button className={`nav-item ${tab==='products'?'active':''}`} onClick={()=>setTab('products')}><IconPackage size={22} strokeWidth={tab==='products'?2.2:1.5}/><span>ပစ္စည်း</span></button>
        <button className={`nav-item ${tab==='sell'?'active':''}`} onClick={()=>{setTab('sell');setSellView('browse');}}><IconShoppingBag size={22} strokeWidth={tab==='sell'?2.2:1.5}/><span>ရောင်း</span></button>
        <button className={`nav-item ${tab==='history'?'active':''}`} onClick={()=>setTab('history')}><IconReceipt size={22} strokeWidth={tab==='history'?2.2:1.5}/><span>မှတ်တမ်း</span></button>
      </nav>

      {showDelete&&(<div className="modal-overlay active" onClick={e=>{if(e.target===e.currentTarget){setShowDelete(false);setDeletingId(null);}}}><div className="modal"><div className="modal-icon"><IconAlertTriangle size={22} strokeWidth={2}/></div><h2>ဖျက်မည်</h2><p>သေချာပါသလား?</p><div className="modal-actions"><button className="btn-cancel" onClick={()=>{setShowDelete(false);setDeletingId(null);}}>မလုပ်ပါ</button><button className="btn-delete-confirm" onClick={confirmDelete}>ဖျက်မည်</button></div></div></div>)}
    </div>
  );
}
