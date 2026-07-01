let ingredients = [];
let recipes = [];
let baseRecipes = [];
let ingredientMap = new Map();
let customTags = loadJSON('recipeLibraryCustomTags', {});
let recipeEdits = loadJSON('recipeLibraryRecipeEdits', {});
let customRecipes = loadJSON('recipeLibraryCustomRecipes', []);
let dailyLog = loadJSON('recipeLibraryDailyLog', {});
let macroTargets = loadJSON('recipeLibraryMacroTargets', {calories:1600,protein:100,carbs:190,fat:55,fibre:30});
let builderIngredients = [];

const tagStoreKey = 'recipeLibraryCustomTags';
const recipeEditsKey = 'recipeLibraryRecipeEdits';
const customRecipesKey = 'recipeLibraryCustomRecipes';
const dailyLogKey = 'recipeLibraryDailyLog';
const macroTargetsKey = 'recipeLibraryMacroTargets';

const fmt = n => Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : '0';
function loadJSON(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } }
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function saveCustomTags(){ saveJSON(tagStoreKey, customTags); }
function saveRecipeEdits(){ saveJSON(recipeEditsKey, recipeEdits); }
function saveCustomRecipes(){ saveJSON(customRecipesKey, customRecipes); }
function saveDailyLog(){ saveJSON(dailyLogKey, dailyLog); }
function saveTargets(){ saveJSON(macroTargetsKey, macroTargets); }
function escapeHTML(value){ return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char])); }
function slugify(value){ return String(value || 'recipe').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50) || 'recipe'; }
function todayLocal(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function shiftDate(dateStr, offset){ const [y,m,d] = dateStr.split('-').map(Number); const date = new Date(y, m - 1, d); date.setDate(date.getDate() + offset); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function shortDateLabel(dateStr){ const [y,m,d] = dateStr.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', {weekday:'short', day:'numeric'}); }
function normalizeTag(value){ return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 32); }
function getRecipeTags(recipe){ return customTags[recipe.id] || recipe.tags || []; }
function setRecipeTags(recipeId, tags){ customTags[recipeId] = [...new Set(tags.map(normalizeTag).filter(Boolean))]; saveCustomTags(); }
function emptyMacros(){return {calories:0,protein:0,carbs:0,fat:0,fibre:0,addedSugar:0,naturalSugar:0,totalSugar:0};}
function addMacros(a,b){ for(const key of Object.keys(a)) a[key] += b[key] || 0; a.totalSugar = a.addedSugar + a.naturalSugar; return a; }
function ingredientMacros(ingredient, amount){
  const m = emptyMacros(); if(!ingredient) return m;
  const factor = ['item','scoop','can','pack'].includes(ingredient.unit) ? amount : amount / 100;
  for(const key of ['calories','protein','carbs','fat','fibre','addedSugar','naturalSugar']) m[key] = (ingredient[key] || 0) * factor;
  m.totalSugar = m.addedSugar + m.naturalSugar; return m;
}
function recipeMacrosFromIngredients(items){ const total = emptyMacros(); (items || []).forEach(item => addMacros(total, ingredientMacros(ingredientMap.get(item.ingredientId), Number(item.amount || 0)))); return total; }
function recipeMacros(recipe){
  const total = emptyMacros();
  document.querySelectorAll(`[data-recipe="${recipe.id}"][data-ingredient]`).forEach(input => addMacros(total, ingredientMacros(ingredientMap.get(input.dataset.ingredient), Number(input.value || 0))));
  return total;
}
function macroHTML(m){ return `<div class="macro"><strong>${fmt(m.calories)}</strong><span>kcal</span></div><div class="macro"><strong>${fmt(m.protein)}g</strong><span>protein</span></div><div class="macro"><strong>${fmt(m.carbs)}g</strong><span>carbs</span></div><div class="macro"><strong>${fmt(m.fat)}g</strong><span>fat</span></div><div class="macro"><strong>${fmt(m.fibre)}g</strong><span>fibre</span></div>`; }
function sugarText(m){ return `Added sugar: ${fmt(m.addedSugar)}g · Natural sugar: ${fmt(m.naturalSugar)}g · Total sugar: ${fmt(m.totalSugar)}g`; }
function ingredientUnitLabel(ing){ return ing && ['item','scoop','can','pack'].includes(ing.unit) ? ing.unit : 'g'; }
function findIngredientByInput(value){ const q = String(value || '').toLowerCase().trim(); if(!q) return null; return ingredients.find(i => i.name.toLowerCase() === q || i.id.toLowerCase() === q) || ingredients.find(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q)); }
function refreshAllRecipes(){ recipes = baseRecipes.map(r => ({...r, ingredients:[...(recipeEdits[r.id]?.ingredients || r.ingredients || [])]})).concat(customRecipes); }
function persistRecipe(recipe){ if(recipe.custom){ customRecipes = customRecipes.map(r => r.id === recipe.id ? recipe : r); saveCustomRecipes(); } else { recipeEdits[recipe.id] = {...(recipeEdits[recipe.id] || {}), ingredients: recipe.ingredients}; saveRecipeEdits(); } }

function setupTabs(){
  document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab)?.classList.add('active');
    window.scrollTo({top:0, behavior:'smooth'});
  }));
}

function refreshTagFilter(){
  const tagFilter = document.getElementById('tagFilter'); const selected = tagFilter.value;
  const tags = [...new Set(recipes.flatMap(getRecipeTags))].sort((a,b)=>a.localeCompare(b));
  tagFilter.innerHTML = '<option value="">All tags</option>';
  tags.forEach(t => tagFilter.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`));
  tagFilter.value = tags.includes(selected) ? selected : '';
}
function renderTagChips(recipe){ return getRecipeTags(recipe).map(t => `<span class="tag">${escapeHTML(t)} <button type="button" class="tag-x" data-remove-tag="${escapeHTML(recipe.id)}" data-tag="${escapeHTML(t)}" aria-label="Remove ${escapeHTML(t)} tag">×</button></span>`).join(''); }
function renderRecipes(){
  const q = document.getElementById('search').value.toLowerCase().trim(); const tag = document.getElementById('tagFilter').value; const grid = document.getElementById('recipeGrid'); grid.innerHTML = '';
  const matchingRecipes = recipes.filter(r => { const tags = getRecipeTags(r); const ingredientNames = (r.ingredients || []).map(item => ingredientMap.get(item.ingredientId)?.name || item.ingredientId); const text = [r.name, ...tags, ...ingredientNames, ...(r.method||[]), ...(r.seasoning||[])].join(' ').toLowerCase(); return (!q || text.includes(q)) && (!tag || tags.includes(tag)); });
  if(!matchingRecipes.length){ grid.innerHTML = '<article class="card"><h2>No recipes found</h2><p class="seasoning">Try a different keyword or tag.</p></article>'; return; }
  matchingRecipes.forEach(recipe => {
    const card = document.createElement('article'); card.className = 'card';
    const rows = recipe.ingredients.map((item, index) => { const ing = ingredientMap.get(item.ingredientId); return `<tr><td>${escapeHTML(ing ? ing.name : item.ingredientId)}</td><td><input type="number" min="0" step="1" value="${item.amount}" data-recipe="${escapeHTML(recipe.id)}" data-ingredient="${escapeHTML(item.ingredientId)}" data-row-index="${index}"></td><td>${escapeHTML(ingredientUnitLabel(ing))}</td><td><button type="button" class="small-button" data-remove-ingredient="${escapeHTML(recipe.id)}" data-index="${index}">Remove</button></td></tr>`; }).join('');
    card.innerHTML = `<h2>${escapeHTML(recipe.name)}</h2><div class="tags">${renderTagChips(recipe)}</div><div class="tag-editor"><input type="text" placeholder="Add tag" data-tag-input="${escapeHTML(recipe.id)}"><button type="button" data-add-tag="${escapeHTML(recipe.id)}">Add</button></div><div class="macro-line" id="macros-${escapeHTML(recipe.id)}"></div><p class="seasoning" id="sugar-${escapeHTML(recipe.id)}"></p><table><thead><tr><th>Ingredient</th><th>Amount</th><th>Unit</th><th></th></tr></thead><tbody>${rows}</tbody></table><div class="ingredient-editor"><input type="search" list="ingredientDatalist" placeholder="Add ingredient" data-add-ingredient-name="${escapeHTML(recipe.id)}"><input type="number" min="0" step="1" value="100" data-add-ingredient-amount="${escapeHTML(recipe.id)}"><button type="button" data-add-ingredient="${escapeHTML(recipe.id)}">Add item</button></div><div class="card-actions"><button type="button" data-add-recipe-to-day="${escapeHTML(recipe.id)}">Add recipe to day</button>${recipe.custom ? `<button type="button" data-delete-custom-recipe="${escapeHTML(recipe.id)}">Delete recipe</button>` : ''}</div>${(recipe.seasoning||[]).length ? `<p class="seasoning"><strong>Seasoning:</strong> ${recipe.seasoning.map(escapeHTML).join(', ')}</p>` : ''}<ol class="method">${(recipe.method||[]).map(step=>`<li>${escapeHTML(step)}</li>`).join('')}</ol>`;
    grid.appendChild(card);
  });
  document.querySelectorAll('input[data-recipe]').forEach(input => input.addEventListener('input', handleIngredientAmountInput));
  updateAllMacros();
}
function handleIngredientAmountInput(event){ const recipe = recipes.find(r => r.id === event.target.dataset.recipe); if(!recipe) return; const index = Number(event.target.dataset.rowIndex); if(recipe.ingredients[index]) recipe.ingredients[index].amount = Number(event.target.value || 0); persistRecipe(recipe); updateAllMacros(); }
function updateAllMacros(){ recipes.forEach(recipe => { const box = document.getElementById(`macros-${recipe.id}`); const sugar = document.getElementById(`sugar-${recipe.id}`); if(!box) return; const total = recipeMacros(recipe); box.innerHTML = macroHTML(total); sugar.textContent = sugarText(total); }); updateIngredientCalculator(); renderDailyTracker(); renderBuilder(); }
function populateIngredientDatalist(){ document.getElementById('ingredientDatalist').innerHTML = ingredients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(i => `<option value="${escapeHTML(i.name)}"></option>`).join(''); }
function populateIngredientSelect(){ const filter = document.getElementById('ingredientSearch').value.toLowerCase().trim(); const select = document.getElementById('ingredientSelect'); const previous = select.value; const filtered = ingredients.slice().sort((a,b)=>a.name.localeCompare(b.name)).filter(i => !filter || i.name.toLowerCase().includes(filter) || i.id.toLowerCase().includes(filter)); select.innerHTML = ''; filtered.forEach(i => select.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(i.id)}">${escapeHTML(i.name)}</option>`)); if(filtered.some(i => i.id === previous)) select.value = previous; else if(filtered[0]) select.value = filtered[0].id; updateIngredientCalculator(); }
function updateIngredientCalculator(){ const select = document.getElementById('ingredientSelect'); if(!select) return; const id = select.value; const amount = Number(document.getElementById('ingredientAmount').value || 0); const ing = ingredientMap.get(id); const unit = document.getElementById('ingredientUnit'); if(!ing){ unit.textContent = ''; document.getElementById('ingredientResult').innerHTML = '<p class="seasoning">No matching ingredient found.</p>'; return; } unit.textContent = ingredientUnitLabel(ing); const m = ingredientMacros(ing, amount); document.getElementById('ingredientResult').innerHTML = macroHTML(m) + `<p class="seasoning">${sugarText(m)}</p>`; }
function getSelectedDate(){ return document.getElementById('trackerDate').value || todayLocal(); }
function getEntriesForDate(date){ return dailyLog[date]?.entries || []; }
function totalsForEntries(entries){ const total = emptyMacros(); entries.forEach(e => addMacros(total, e.macros || emptyMacros())); return total; }
function addEntryToDay(label, macros){ const date = getSelectedDate(); if(!dailyLog[date]) dailyLog[date] = {entries:[]}; dailyLog[date].entries.push({id:`entry-${Date.now()}-${Math.random().toString(16).slice(2)}`, label, macros, createdAt:new Date().toISOString()}); saveDailyLog(); renderDailyTracker(); }
function renderProgress(name, value, target, suffix='g'){ const percent = target > 0 ? Math.min((value / target) * 100, 120) : 0; const label = name === 'Calories' ? `${fmt(value)} / ${fmt(target)} kcal` : `${fmt(value)} / ${fmt(target)}${suffix}`; return `<div class="progress-row"><div><strong>${name}</strong><span>${label}</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div></div>`; }
function renderDailyTracker(){
  const trackerDate = document.getElementById('trackerDate'); if(!trackerDate) return; const date = getSelectedDate(); const entries = getEntriesForDate(date); const totals = totalsForEntries(entries);
  document.getElementById('dailyTotals').innerHTML = macroHTML(totals);
  document.getElementById('sugarTotals').textContent = sugarText(totals);
  document.getElementById('macroProgress').innerHTML = [renderProgress('Calories', totals.calories, macroTargets.calories, 'kcal'),renderProgress('Protein', totals.protein, macroTargets.protein),renderProgress('Carbs', totals.carbs, macroTargets.carbs),renderProgress('Fat', totals.fat, macroTargets.fat),renderProgress('Fibre', totals.fibre, macroTargets.fibre)].join('');
  document.getElementById('dailyEntries').innerHTML = entries.length ? entries.map(e => `<div class="entry"><span>${escapeHTML(e.label)}</span><span>${fmt(e.macros.calories)} kcal · P ${fmt(e.macros.protein)} · C ${fmt(e.macros.carbs)} · F ${fmt(e.macros.fat)} · Fi ${fmt(e.macros.fibre)} · Sugar ${fmt((e.macros.addedSugar||0)+(e.macros.naturalSugar||0))}</span><button type="button" data-delete-entry="${escapeHTML(e.id)}">×</button></div>`).join('') : '<p class="seasoning">No entries logged for this day yet.</p>';
  renderCalorieChart(date);
}
function renderCalorieChart(selectedDate){ const days = Array.from({length:7}, (_, i) => shiftDate(selectedDate, i - 6)); const rows = days.map(date => ({date, calories: totalsForEntries(getEntriesForDate(date)).calories})); const logged = rows.filter(r => r.calories > 0); const avg = logged.length ? logged.reduce((s,r)=>s+r.calories,0) / logged.length : 0; document.getElementById('weeklyAverage').innerHTML = `<strong>Weekly average:</strong> ${fmt(avg)} kcal/day across ${logged.length || 0} logged day${logged.length === 1 ? '' : 's'}.`; const max = Math.max(macroTargets.calories, ...rows.map(r => r.calories), 1); document.getElementById('calorieChart').innerHTML = rows.map(r => { const h = Math.max(5, (r.calories / max) * 100); return `<div class="bar-wrap"><div class="bar-value">${fmt(r.calories)}</div><div class="bar-shell"><div class="bar" style="height:${h}%"></div></div><span>${shortDateLabel(r.date)}</span></div>`; }).join(''); }
function saveTargetInputs(){ macroTargets = {calories:Number(document.getElementById('targetCalories').value || 0),protein:Number(document.getElementById('targetProtein').value || 0),carbs:Number(document.getElementById('targetCarbs').value || 0),fat:Number(document.getElementById('targetFat').value || 0),fibre:Number(document.getElementById('targetFibre').value || 0)}; saveTargets(); renderDailyTracker(); }
function hydrateTargetInputs(){ document.getElementById('targetCalories').value = macroTargets.calories; document.getElementById('targetProtein').value = macroTargets.protein; document.getElementById('targetCarbs').value = macroTargets.carbs; document.getElementById('targetFat').value = macroTargets.fat; document.getElementById('targetFibre').value = macroTargets.fibre; }
function renderBuilder(){ const list = document.getElementById('builderIngredients'); const totalsBox = document.getElementById('builderTotals'); if(!list || !totalsBox) return; list.innerHTML = builderIngredients.length ? builderIngredients.map((item, index) => { const ing = ingredientMap.get(item.ingredientId); return `<div class="entry"><span>${escapeHTML(ing?.name || item.ingredientId)}</span><span>${fmt(item.amount)} ${escapeHTML(ingredientUnitLabel(ing))}</span><button type="button" data-builder-remove="${index}">×</button></div>`; }).join('') : '<p class="seasoning">No ingredients added yet.</p>'; totalsBox.innerHTML = macroHTML(recipeMacrosFromIngredients(builderIngredients)); }
function handleRecipeGridClick(event){
  const addButton = event.target.closest('[data-add-tag]'); const removeButton = event.target.closest('[data-remove-tag]'); const addIngredientButton = event.target.closest('[data-add-ingredient]'); const removeIngredientButton = event.target.closest('[data-remove-ingredient]'); const addRecipeToDayButton = event.target.closest('[data-add-recipe-to-day]'); const deleteCustomButton = event.target.closest('[data-delete-custom-recipe]');
  if(addButton){ const recipeId = addButton.dataset.addTag; const recipe = recipes.find(r => r.id === recipeId); const input = document.querySelector(`[data-tag-input="${recipeId}"]`); const newTag = normalizeTag(input.value); if(recipe && newTag){ setRecipeTags(recipeId, [...getRecipeTags(recipe), newTag]); refreshTagFilter(); renderRecipes(); } }
  if(removeButton){ const recipeId = removeButton.dataset.removeTag; const recipe = recipes.find(r => r.id === recipeId); if(recipe){ setRecipeTags(recipeId, getRecipeTags(recipe).filter(t => t !== removeButton.dataset.tag)); refreshTagFilter(); renderRecipes(); } }
  if(addIngredientButton){ const recipeId = addIngredientButton.dataset.addIngredient; const recipe = recipes.find(r => r.id === recipeId); const nameInput = document.querySelector(`[data-add-ingredient-name="${recipeId}"]`); const amountInput = document.querySelector(`[data-add-ingredient-amount="${recipeId}"]`); const ing = findIngredientByInput(nameInput.value); if(recipe && ing){ recipe.ingredients.push({ingredientId: ing.id, amount: Number(amountInput.value || 0)}); persistRecipe(recipe); renderRecipes(); } else alert('Ingredient not found. Try typing the ingredient exactly as it appears in the list.'); }
  if(removeIngredientButton){ const recipe = recipes.find(r => r.id === removeIngredientButton.dataset.removeIngredient); const index = Number(removeIngredientButton.dataset.index); if(recipe && recipe.ingredients[index]){ recipe.ingredients.splice(index, 1); persistRecipe(recipe); renderRecipes(); } }
  if(addRecipeToDayButton){ const recipe = recipes.find(r => r.id === addRecipeToDayButton.dataset.addRecipeToDay); if(recipe) addEntryToDay(recipe.name, recipeMacros(recipe)); }
  if(deleteCustomButton){ const recipeId = deleteCustomButton.dataset.deleteCustomRecipe; customRecipes = customRecipes.filter(r => r.id !== recipeId); delete customTags[recipeId]; saveCustomTags(); saveCustomRecipes(); refreshAllRecipes(); refreshTagFilter(); renderRecipes(); }
}
function setupEvents(){
  setupTabs();
  document.getElementById('search').addEventListener('input', renderRecipes); document.getElementById('tagFilter').addEventListener('change', renderRecipes); document.getElementById('ingredientSearch').addEventListener('input', populateIngredientSelect); document.getElementById('ingredientSelect').addEventListener('change', updateIngredientCalculator); document.getElementById('ingredientAmount').addEventListener('input', updateIngredientCalculator);
  document.getElementById('addIngredientToDay').addEventListener('click', () => { const ing = ingredientMap.get(document.getElementById('ingredientSelect').value); const amount = Number(document.getElementById('ingredientAmount').value || 0); if(ing) addEntryToDay(`${ing.name} (${fmt(amount)} ${ingredientUnitLabel(ing)})`, ingredientMacros(ing, amount)); });
  document.getElementById('recipeGrid').addEventListener('click', handleRecipeGridClick); document.getElementById('trackerDate').addEventListener('change', renderDailyTracker); ['targetCalories','targetProtein','targetCarbs','targetFat','targetFibre'].forEach(id => document.getElementById(id).addEventListener('input', saveTargetInputs));
  document.getElementById('addManualEntry').addEventListener('click', () => { const label = document.getElementById('manualName').value.trim() || 'Manual entry'; const macros = emptyMacros(); macros.calories = Number(document.getElementById('manualCalories').value || 0); macros.protein = Number(document.getElementById('manualProtein').value || 0); macros.carbs = Number(document.getElementById('manualCarbs').value || 0); macros.fat = Number(document.getElementById('manualFat').value || 0); macros.fibre = Number(document.getElementById('manualFibre').value || 0); macros.addedSugar = Number(document.getElementById('manualAddedSugar').value || 0); macros.naturalSugar = Number(document.getElementById('manualNaturalSugar').value || 0); macros.totalSugar = macros.addedSugar + macros.naturalSugar; addEntryToDay(label, macros); ['manualName','manualCalories','manualProtein','manualCarbs','manualFat','manualFibre','manualAddedSugar','manualNaturalSugar'].forEach(id => document.getElementById(id).value = ''); });
  document.getElementById('dailyEntries').addEventListener('click', event => { const btn = event.target.closest('[data-delete-entry]'); if(!btn) return; const date = getSelectedDate(); dailyLog[date].entries = getEntriesForDate(date).filter(e => e.id !== btn.dataset.deleteEntry); saveDailyLog(); renderDailyTracker(); });
  document.getElementById('addBuilderIngredient').addEventListener('click', () => { const ing = findIngredientByInput(document.getElementById('newRecipeIngredientSearch').value); if(!ing){ alert('Ingredient not found. Try typing the ingredient exactly as it appears in the list.'); return; } builderIngredients.push({ingredientId: ing.id, amount: Number(document.getElementById('newRecipeIngredientAmount').value || 0)}); document.getElementById('newRecipeIngredientSearch').value = ''; renderBuilder(); });
  document.getElementById('builderIngredients').addEventListener('click', event => { const btn = event.target.closest('[data-builder-remove]'); if(!btn) return; builderIngredients.splice(Number(btn.dataset.builderRemove), 1); renderBuilder(); });
  document.getElementById('saveNewRecipe').addEventListener('click', () => { const name = document.getElementById('newRecipeName').value.trim(); if(!name){ alert('Add a recipe name first.'); return; } if(!builderIngredients.length){ alert('Add at least one ingredient.'); return; } const id = `custom-${slugify(name)}-${Date.now()}`; const tags = document.getElementById('newRecipeTags').value.split(',').map(normalizeTag).filter(Boolean); const method = document.getElementById('newRecipeMethod').value.split('\n').map(s => s.trim()).filter(Boolean); const recipe = {id, name, tags, ingredients: builderIngredients, method, seasoning:[], custom:true}; customRecipes.push(recipe); saveCustomRecipes(); builderIngredients = []; ['newRecipeName','newRecipeTags','newRecipeIngredientSearch','newRecipeMethod'].forEach(id => document.getElementById(id).value = ''); document.getElementById('newRecipeIngredientAmount').value = 100; refreshAllRecipes(); refreshTagFilter(); renderBuilder(); renderRecipes(); });
}
async function loadRemoteDailyLog(){
  try{
    const res = await fetch('daily-log.json', {cache:'no-store'});
    if(!res.ok) return;
    const remote = await res.json();
    for(const [date, data] of Object.entries(remote || {})){
      if(!dailyLog[date] || !dailyLog[date].entries?.length) dailyLog[date] = data;
    }
    saveDailyLog();
  } catch {}
}
async function init(){
  const [ingRes, recRes] = await Promise.all([fetch('ingredients.json'), fetch('recipes.json')]);
  ingredients = await ingRes.json(); baseRecipes = await recRes.json(); ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  await loadRemoteDailyLog(); refreshAllRecipes(); document.getElementById('trackerDate').value = todayLocal(); hydrateTargetInputs(); populateIngredientDatalist(); refreshTagFilter(); populateIngredientSelect(); renderBuilder(); renderRecipes(); setupEvents(); renderDailyTracker();
}
init().catch(err => { document.getElementById('recipeGrid').innerHTML = `<article class="card"><h2>Could not load recipes</h2><p>${escapeHTML(err.message)}</p></article>`; });
