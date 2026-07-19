(()=>{
  const ING_EDITS_KEY='recipeLibraryIngredientEdits';
  const CUSTOM_INGS_KEY='recipeLibraryCustomIngredients';
  const FULL_RECIPE_EDITS_KEY='recipeLibraryFullRecipeEdits';
  const CUSTOM_RECIPES_KEY='recipeLibraryCustomRecipes';

  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const clone=v=>JSON.parse(JSON.stringify(v));
  const slug=v=>String(v||'ingredient').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'ingredient';

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const response=await originalFetch(input,init);
    if(!response.ok)return response;
    if(url.endsWith('ingredients.json')||url.includes('/ingredients.json?')){
      const data=await response.clone().json();
      const edits=read(ING_EDITS_KEY,{});
      const custom=read(CUSTOM_INGS_KEY,[]);
      const merged=data.map(i=>({...i,...(edits[i.id]||{})}));
      const ids=new Set(merged.map(i=>i.id));
      custom.forEach(i=>{if(!ids.has(i.id))merged.push(i)});
      return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}});
    }
    if(url.endsWith('recipes.json')||url.includes('/recipes.json?')){
      const data=await response.clone().json();
      const edits=read(FULL_RECIPE_EDITS_KEY,{});
      const merged=data.map(r=>({...r,...(edits[r.id]||{}),ingredients:edits[r.id]?.ingredients||r.ingredients}));
      return new Response(JSON.stringify(merged),{status:response.status,statusText:response.statusText,headers:{'Content-Type':'application/json'}});
    }
    return response;
  };

  let ingredientList=[];
  let recipeList=[];

  async function loadData(){
    try{
      ingredientList=await (await fetch('ingredients.json')).json();
      recipeList=await (await fetch('recipes.json')).json();
      const customRecipes=read(CUSTOM_RECIPES_KEY,[]);
      recipeList=[...recipeList,...customRecipes];
    }catch(e){console.error('Editor data load failed',e)}
  }

  function sortedIngredients(){return ingredientList.slice().sort((a,b)=>a.name.localeCompare(b.name))}
  function options(selected=''){
    return '<option value="">Choose saved ingredient…</option>'+sortedIngredients().map(i=>`<option value="${escapeHtml(i.name)}" ${i.name===selected?'selected':''}>${escapeHtml(i.name)}</option>`).join('');
  }
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function findIngredient(value){
    const q=String(value||'').toLowerCase().trim();
    if(!q)return null;
    return ingredientList.find(i=>i.name.toLowerCase()===q||i.id.toLowerCase()===q)||ingredientList.find(i=>i.name.toLowerCase().includes(q)||i.id.toLowerCase().includes(q))||null;
  }

  function upgradeIngredientPickers(root=document){
    root.querySelectorAll('input[data-add-ingredient-name]').forEach(input=>{
      if(input.dataset.upgraded)return;
      input.setAttribute('list','ingredientDatalist');
      input.setAttribute('autocomplete','off');
      input.classList.add('ingredient-lookup-input');
      input.dataset.upgraded='1';
    });
    const builder=document.getElementById('newRecipeIngredientSearch');
    if(builder&&builder.tagName==='INPUT'){
      builder.setAttribute('list','ingredientDatalist');
      builder.setAttribute('autocomplete','off');
      builder.classList.add('ingredient-lookup-input');
      builder.dataset.upgraded='1';
    }
  }

  function ensureStyles(){
    if(document.getElementById('editorEnhancementStyles'))return;
    const s=document.createElement('style');
    s.id='editorEnhancementStyles';
    s.textContent=`
      .editor-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.75rem 0}.editor-actions button{width:auto}
      .food-editor-modal{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:5vh 16px;overflow:auto}
      .food-editor-panel{width:min(720px,100%);background:var(--card,#fff);color:inherit;border:1px solid var(--border,#2a3440);border-radius:8px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.45)}
      .food-editor-panel h2{margin-top:0}.food-editor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.food-editor-grid .wide{grid-column:1/-1}
      .food-editor-panel input,.food-editor-panel select,.food-editor-panel textarea{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--border,#2a3440);border-radius:8px;background:var(--input,#111820);color:inherit}
      .editor-ingredient-row{display:grid;grid-template-columns:minmax(0,1fr) 100px auto;gap:8px;align-items:center;margin:8px 0}
      .food-editor-buttons{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;flex-wrap:wrap}
      @media(max-width:560px){.food-editor-grid{grid-template-columns:1fr}.editor-ingredient-row{grid-template-columns:1fr 90px auto}}
    `;
    document.head.appendChild(s);
  }

  function modal(title,bodyHtml,onSave){
    const wrap=document.createElement('div');
    wrap.className='food-editor-modal';
    wrap.innerHTML=`<section class="food-editor-panel"><h2>${escapeHtml(title)}</h2>${bodyHtml}<div class="food-editor-buttons"><button type="button" data-editor-cancel>Cancel</button><button type="button" data-editor-save>Save changes</button></div></section>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-editor-cancel]').addEventListener('click',()=>wrap.remove());
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
    wrap.querySelector('[data-editor-save]').addEventListener('click',()=>onSave(wrap,()=>wrap.remove()));
    return wrap;
  }

  function addIngredientEditor(){
    const panel=document.getElementById('ingredientsPanel');
    if(!panel||panel.querySelector('[data-ingredient-editor-actions]'))return;
    const actions=document.createElement('div');
    actions.className='editor-actions';
    actions.dataset.ingredientEditorActions='1';
    actions.innerHTML='<button type="button" data-edit-selected-ingredient>Edit selected ingredient</button><button type="button" data-add-new-ingredient>Add new ingredient</button>';
    panel.appendChild(actions);
    actions.querySelector('[data-edit-selected-ingredient]').addEventListener('click',()=>{
      const id=document.getElementById('ingredientSelect')?.value;
      const ing=ingredientList.find(i=>i.id===id);
      if(ing)openIngredientEditor(ing,false);
    });
    actions.querySelector('[data-add-new-ingredient]').addEventListener('click',()=>openIngredientEditor({id:'',name:'',unit:'100g',calories:0,protein:0,carbs:0,fat:0,fibre:0,addedSugar:0,naturalSugar:0},true));
  }

  function openIngredientEditor(ing,isNew){
    const fields=['calories','protein','carbs','fat','fibre','addedSugar','naturalSugar'];
    const body=`<div class="food-editor-grid">
      <label class="wide">Name<input data-ie="name" value="${escapeHtml(ing.name)}"></label>
      <label>Unit<select data-ie="unit"><option value="100g" ${ing.unit==='100g'?'selected':''}>per 100g</option><option value="100g raw" ${ing.unit==='100g raw'?'selected':''}>per 100g raw</option><option value="item" ${ing.unit==='item'?'selected':''}>per item</option><option value="scoop" ${ing.unit==='scoop'?'selected':''}>per scoop</option><option value="can" ${ing.unit==='can'?'selected':''}>per can</option><option value="pack" ${ing.unit==='pack'?'selected':''}>per pack</option></select></label>
      ${fields.map(f=>`<label>${f.replace(/([A-Z])/g,' $1')}<input type="number" step="0.1" min="0" data-ie="${f}" value="${Number(ing[f]||0)}"></label>`).join('')}
    </div>`;
    modal(isNew?'Add ingredient':'Edit ingredient',body,(wrap,close)=>{
      const get=k=>wrap.querySelector(`[data-ie="${k}"]`)?.value;
      const name=get('name').trim();if(!name){alert('Add an ingredient name.');return}
      const value={...ing,id:isNew?`custom-${slug(name)}-${Date.now()}`:ing.id,name,unit:get('unit')};
      fields.forEach(f=>value[f]=Number(get(f)||0));
      if(isNew){const custom=read(CUSTOM_INGS_KEY,[]);custom.push(value);write(CUSTOM_INGS_KEY,custom)}else{const edits=read(ING_EDITS_KEY,{});edits[ing.id]=value;write(ING_EDITS_KEY,edits)}
      close();location.reload();
    });
  }

  function addRecipeEditButtons(root=document){
    root.querySelectorAll('.recipe-card').forEach(card=>{
      if(card.querySelector('[data-full-edit-recipe]'))return;
      const toggle=card.querySelector('[data-toggle-recipe]');
      const id=toggle?.dataset.recipeId;if(!id)return;
      const actions=card.querySelector('.card-actions');if(!actions)return;
      const b=document.createElement('button');b.type='button';b.dataset.fullEditRecipe=id;b.textContent='Edit recipe';actions.appendChild(b);
    });
  }

  function openRecipeEditor(id){
    const r=recipeList.find(x=>x.id===id);if(!r)return;
    const rows=(r.ingredients||[]).map(x=>ingredientRowHtml(x.ingredientId,x.amount)).join('');
    const body=`<div class="food-editor-grid">
      <label class="wide">Recipe name<input data-re="name" value="${escapeHtml(r.name)}"></label>
      <label class="wide">Tags<input data-re="tags" value="${escapeHtml((r.tags||[]).join(', '))}"></label>
      <div class="wide"><strong>Ingredients</strong><div data-re-rows>${rows}</div><button type="button" data-re-add-row>Add ingredient</button></div>
      <label class="wide">Seasoning, one item per line<textarea rows="4" data-re="seasoning">${escapeHtml((r.seasoning||[]).join('\n'))}</textarea></label>
      <label class="wide">Method, one step per line<textarea rows="7" data-re="method">${escapeHtml((r.method||[]).join('\n'))}</textarea></label>
    </div>`;
    const wrap=modal('Edit recipe',body,(box,close)=>{
      const name=box.querySelector('[data-re="name"]').value.trim();if(!name){alert('Add a recipe name.');return}
      const ingredients=[];
      for(const row of box.querySelectorAll('.editor-ingredient-row')){
        const input=row.querySelector('[data-editor-ingredient]');
        const value=input?.value.trim()||'';
        if(!value)continue;
        const ing=findIngredient(value);
        if(!ing){alert(`Ingredient not found: ${value}`);return}
        ingredients.push({ingredientId:ing.id,amount:Number(row.querySelector('[data-editor-amount]').value||0)});
      }
      const edited={...r,name,tags:box.querySelector('[data-re="tags"]').value.split(',').map(x=>x.trim()).filter(Boolean),ingredients,seasoning:box.querySelector('[data-re="seasoning"]').value.split('\n').map(x=>x.trim()).filter(Boolean),method:box.querySelector('[data-re="method"]').value.split('\n').map(x=>x.trim()).filter(Boolean)};
      if(id.startsWith('custom-')){const custom=read(CUSTOM_RECIPES_KEY,[]).map(x=>x.id===id?{...x,...edited,custom:true}:x);write(CUSTOM_RECIPES_KEY,custom)}else{const edits=read(FULL_RECIPE_EDITS_KEY,{});edits[id]=edited;write(FULL_RECIPE_EDITS_KEY,edits)}
      close();location.reload();
    });
    wrap.querySelector('[data-re-add-row]').addEventListener('click',()=>wrap.querySelector('[data-re-rows]').insertAdjacentHTML('beforeend',ingredientRowHtml('',100)));
    wrap.querySelector('[data-re-rows]').addEventListener('click',e=>{const b=e.target.closest('[data-editor-remove-row]');if(b)b.closest('.editor-ingredient-row').remove()});
  }

  function ingredientRowHtml(id,amount){
    const ing=ingredientList.find(i=>i.id===id);
    return `<div class="editor-ingredient-row"><input type="search" list="ingredientDatalist" autocomplete="off" placeholder="Search ingredient" data-editor-ingredient value="${escapeHtml(ing?.name||'')}"><input type="number" min="0" step="0.1" data-editor-amount value="${Number(amount||0)}"><button type="button" data-editor-remove-row>×</button></div>`;
  }

  function wireRecipeEditClicks(){
    document.addEventListener('click',e=>{const b=e.target.closest('[data-full-edit-recipe]');if(b){e.preventDefault();e.stopPropagation();openRecipeEditor(b.dataset.fullEditRecipe)}},true);
  }

  async function boot(){
    ensureStyles();
    await loadData();
    const apply=()=>{upgradeIngredientPickers();addIngredientEditor();addRecipeEditButtons()};
    apply();
    const obs=new MutationObserver(()=>apply());
    obs.observe(document.body,{childList:true,subtree:true});
    wireRecipeEditClicks();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
