let ingredients = [];
let recipes = [];
let ingredientMap = new Map();

const fmt = n => Number.isFinite(n) ? (Math.round(n * 10) / 10).toString() : '0';

function emptyMacros(){return {calories:0,protein:0,carbs:0,fat:0,fibre:0,addedSugar:0,naturalSugar:0,totalSugar:0};}

function addMacros(a,b){
  for(const key of Object.keys(a)) a[key] += b[key] || 0;
  a.totalSugar = a.addedSugar + a.naturalSugar;
  return a;
}

function ingredientMacros(ingredient, amount){
  const m = emptyMacros();
  if(!ingredient) return m;
  const factor = ingredient.unit === 'item' || ingredient.unit === 'scoop' || ingredient.unit === 'can' || ingredient.unit === 'pack'
    ? amount
    : amount / 100;
  for(const key of ['calories','protein','carbs','fat','fibre','addedSugar','naturalSugar']){
    m[key] = (ingredient[key] || 0) * factor;
  }
  m.totalSugar = m.addedSugar + m.naturalSugar;
  return m;
}

function recipeMacros(recipe){
  const total = emptyMacros();
  document.querySelectorAll(`[data-recipe="${recipe.id}"][data-ingredient]`).forEach(input => {
    const ing = ingredientMap.get(input.dataset.ingredient);
    addMacros(total, ingredientMacros(ing, Number(input.value || 0)));
  });
  return total;
}

function macroHTML(m){
  return `<div class="macro"><strong>${fmt(m.calories)}</strong><span>kcal</span></div>
  <div class="macro"><strong>${fmt(m.protein)}g</strong><span>protein</span></div>
  <div class="macro"><strong>${fmt(m.carbs)}g</strong><span>carbs</span></div>
  <div class="macro"><strong>${fmt(m.fat)}g</strong><span>fat</span></div>
  <div class="macro"><strong>${fmt(m.fibre)}g</strong><span>fibre</span></div>`;
}

function sugarText(m){
  return `Added sugar: ${fmt(m.addedSugar)}g · Natural sugar: ${fmt(m.naturalSugar)}g · Total sugar: ${fmt(m.totalSugar)}g`;
}

function renderRecipes(){
  const q = document.getElementById('search').value.toLowerCase().trim();
  const tag = document.getElementById('tagFilter').value;
  const grid = document.getElementById('recipeGrid');
  grid.innerHTML = '';

  recipes.filter(r => {
    const text = [r.name, ...(r.tags||[]), ...(r.method||[]), ...(r.seasoning||[])].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (!tag || (r.tags||[]).includes(tag));
  }).forEach(recipe => {
    const card = document.createElement('article');
    card.className = 'card';
    const rows = recipe.ingredients.map(item => {
      const ing = ingredientMap.get(item.ingredientId);
      const label = ing ? ing.name : item.ingredientId;
      const unitLabel = ing && ['item','scoop','can','pack'].includes(ing.unit) ? ing.unit : 'g';
      return `<tr><td>${label}</td><td><input type="number" min="0" step="1" value="${item.amount}" data-recipe="${recipe.id}" data-ingredient="${item.ingredientId}"></td><td>${unitLabel}</td></tr>`;
    }).join('');

    card.innerHTML = `<h2>${recipe.name}</h2>
      <div class="tags">${(recipe.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
      <div class="macro-line" id="macros-${recipe.id}"></div>
      <p class="seasoning" id="sugar-${recipe.id}"></p>
      <table><thead><tr><th>Ingredient</th><th>Amount</th><th>Unit</th></tr></thead><tbody>${rows}</tbody></table>
      ${(recipe.seasoning||[]).length ? `<p class="seasoning"><strong>Seasoning:</strong> ${recipe.seasoning.join(', ')}</p>` : ''}
      <ol class="method">${(recipe.method||[]).map(step=>`<li>${step}</li>`).join('')}</ol>`;
    grid.appendChild(card);
  });
  document.querySelectorAll('input[data-recipe]').forEach(input => input.addEventListener('input', updateAllMacros));
  updateAllMacros();
}

function updateAllMacros(){
  recipes.forEach(recipe => {
    const box = document.getElementById(`macros-${recipe.id}`);
    const sugar = document.getElementById(`sugar-${recipe.id}`);
    if(!box) return;
    const total = recipeMacros(recipe);
    box.innerHTML = macroHTML(total);
    sugar.textContent = sugarText(total);
  });
  updateIngredientCalculator();
}

function populateControls(){
  const tags = [...new Set(recipes.flatMap(r => r.tags || []))].sort();
  const tagFilter = document.getElementById('tagFilter');
  tags.forEach(t => tagFilter.insertAdjacentHTML('beforeend', `<option value="${t}">${t}</option>`));

  const select = document.getElementById('ingredientSelect');
  ingredients.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(i => {
    select.insertAdjacentHTML('beforeend', `<option value="${i.id}">${i.name}</option>`);
  });
}

function updateIngredientCalculator(){
  const id = document.getElementById('ingredientSelect').value;
  const amount = Number(document.getElementById('ingredientAmount').value || 0);
  const ing = ingredientMap.get(id);
  const unit = document.getElementById('ingredientUnit');
  unit.textContent = ing && ['item','scoop','can','pack'].includes(ing.unit) ? ing.unit : 'g';
  const m = ingredientMacros(ing, amount);
  document.getElementById('ingredientResult').innerHTML = macroHTML(m) + `<p class="seasoning">${sugarText(m)}</p>`;
}

async function init(){
  const [ingRes, recRes] = await Promise.all([fetch('ingredients.json'), fetch('recipes.json')]);
  ingredients = await ingRes.json();
  recipes = await recRes.json();
  ingredientMap = new Map(ingredients.map(i => [i.id, i]));
  populateControls();
  renderRecipes();
  document.getElementById('search').addEventListener('input', renderRecipes);
  document.getElementById('tagFilter').addEventListener('change', renderRecipes);
  document.getElementById('ingredientSelect').addEventListener('change', updateIngredientCalculator);
  document.getElementById('ingredientAmount').addEventListener('input', updateIngredientCalculator);
}

init().catch(err => {
  document.getElementById('recipeGrid').innerHTML = `<article class="card"><h2>Could not load recipes</h2><p>${err.message}</p></article>`;
});
