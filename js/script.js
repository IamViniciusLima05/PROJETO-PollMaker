/* PollMaker — enquetes com resultado em barras e link de compartilhamento */

const $ = (s, el = document) => el.querySelector(s);
const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const banco = {
  ler(k, padrao) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? padrao; } catch { return padrao; } },
  salvar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem storage */ } }
};
const CORES = ['#5b3df5', '#ff6b5b', '#00b894', '#fdcb6e', '#0984e3', '#e84393', '#6c5ce7', '#e17055', '#00cec9', '#2d3436'];
const MIN_OP = 2, MAX_OP = 10;

const EXEMPLOS = [
  { id: 'churras', pergunta: 'Onde vai ser o churrasco do time?', opcoes: [{ texto: 'Na casa do Diego', votos: 7 }, { texto: 'No salão do condomínio', votos: 4 }, { texto: 'Parque da Redenção', votos: 9 }, { texto: 'Restaurante', votos: 2 }], multipla: false, ocultar: false, criada: Date.now() - 864e5 * 2, encerrada: false },
  { id: 'linguagem', pergunta: 'Qual linguagem você quer aprender em 2027?', opcoes: [{ texto: 'Python', votos: 14 }, { texto: 'JavaScript / TypeScript', votos: 11 }, { texto: 'Go', votos: 5 }, { texto: 'Rust', votos: 6 }, { texto: 'Kotlin', votos: 3 }], multipla: true, ocultar: false, criada: Date.now() - 864e5 * 6, encerrada: false }
];
let enquetes = banco.ler('pm_enquetes', null) ?? EXEMPLOS;
let meusVotos = banco.ler('pm_votos', {});
const salvar = () => { banco.salvar('pm_enquetes', enquetes); banco.salvar('pm_votos', meusVotos); };
const total = (e) => e.opcoes.reduce((s, o) => s + o.votos, 0);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* Link de compartilhamento: a enquete viaja codificada no endereço */
function codificar(e) {
  const json = JSON.stringify({ i: e.id, q: e.pergunta, o: e.opcoes.map((o) => o.texto), m: e.multipla ? 1 : 0, h: e.ocultar ? 1 : 0 });
  const bytes = new TextEncoder().encode(json);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodificar(cod) {
  try {
    const b64 = cod.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const d = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof d.q !== 'string' || !Array.isArray(d.o) || d.o.length < MIN_OP) return null;
    return {
      id: String(d.i || Date.now()).replace(/[^\w-]/g, '').slice(0, 40), pergunta: d.q.slice(0, 140),
      opcoes: d.o.slice(0, MAX_OP).map((t) => ({ texto: String(t).slice(0, 80), votos: 0 })), multipla: !!d.m, ocultar: !!d.h, criada: Date.now(), encerrada: false
    };
  } catch { return null; }
}
const linkDe = (e) => `${location.href.split('#')[0]}#/v/${codificar(e)}`;

/* ---------- Telas ---------- */
const app = $('#app');
function usar(tpl) { app.innerHTML = ''; app.append($(`#${tpl}`).content.cloneNode(true)); scrollTo(0, 0); }

function telaInicio() {
  usar('tpl-inicio');
  document.title = 'PollMaker | Crie enquetes';
  const lista = [...enquetes].sort((a, b) => b.criada - a.criada);
  $('#enquetes').innerHTML = lista.length ? lista.map((e) => {
    const t = total(e) || 1;
    return `<li><a href="#/p/${e.id}"><b>${escapar(e.pergunta)}${e.encerrada ? '<span class="encerrada">encerrada</span>' : ''}</b>
      <small>${plural(e.opcoes.length, 'opção', 'opções')} · ${new Date(e.criada).toLocaleDateString('pt-BR')}${meusVotos[e.id] ? ' · você votou' : ''}</small>
      <span class="votos">${total(e)}<span>${total(e) === 1 ? 'voto' : 'votos'}</span></span>
      <span class="mini-barras" aria-hidden="true">${e.opcoes.map((o, i) => `<i style="width:${(o.votos / t) * 100}%;background:${CORES[i % CORES.length]}"></i>`).join('')}</span></a></li>`;
  }).join('') : '<li class="vazio">Nenhuma enquete ainda. Crie a primeira!</li>';
}

function telaNova() {
  usar('tpl-nova');
  document.title = 'Nova enquete | PollMaker';
  const ol = $('#n-opcoes');
  const addOpcao = (valor = '', foco = false) => {
    if (ol.children.length >= MAX_OP) return;
    const li = document.createElement('li');
    li.innerHTML = `<input maxlength="80" placeholder="Opção ${ol.children.length + 1}" aria-label="Opção ${ol.children.length + 1}"><button type="button" class="x" aria-label="Remover opção">×</button>`;
    $('input', li).value = valor;
    ol.append(li);
    atualizar();
    if (foco) $('input', li).focus();
  };
  const atualizar = () => {
    const n = ol.children.length;
    [...ol.children].forEach((li, i) => { $('input', li).placeholder = `Opção ${i + 1}`; $('input', li).setAttribute('aria-label', `Opção ${i + 1}`); $('.x', li).disabled = n <= MIN_OP; });
    $('#n-add').hidden = n >= MAX_OP;
  };
  addOpcao(); addOpcao(); addOpcao();
  $('#n-add').addEventListener('click', () => addOpcao('', true));
  ol.addEventListener('click', (e) => { const x = e.target.closest('.x'); if (x && ol.children.length > MIN_OP) { x.parentElement.remove(); atualizar(); } });
  // Enter na última opção cria outra
  ol.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input')) {
      e.preventDefault();
      if (e.target.parentElement === ol.lastElementChild && e.target.value.trim()) addOpcao('', true);
      else e.target.parentElement.nextElementSibling?.querySelector('input').focus();
    }
  });
  $('#form-nova').addEventListener('submit', (e) => {
    e.preventDefault();
    const pergunta = $('#n-pergunta').value.trim();
    const textos = [...ol.querySelectorAll('input')].map((i) => i.value.trim()).filter(Boolean);
    const unicos = [...new Map(textos.map((t) => [t.toLowerCase(), t])).values()];
    if (!pergunta) { $('#n-erro').textContent = 'Escreva a pergunta.'; return; }
    if (unicos.length < MIN_OP) { $('#n-erro').textContent = 'Coloque pelo menos 2 opções diferentes.'; return; }
    const nova = { id: Date.now().toString(36), pergunta, opcoes: unicos.map((t) => ({ texto: t, votos: 0 })), multipla: $('#n-multipla').checked, ocultar: $('#n-ocultar').checked, criada: Date.now(), encerrada: false };
    enquetes.push(nova); salvar();
    location.hash = `#/p/${nova.id}`;
    toast('Enquete criada! Agora é só compartilhar.');
  });
  $('#n-pergunta').focus();
}

let verResultado = false;
function telaEnquete(id) {
  const e = enquetes.find((x) => x.id === id);
  if (!e) { location.hash = '#/'; toast('Enquete não encontrada'); return; }
  usar('tpl-enquete');
  document.title = `${e.pergunta} | PollMaker`;
  verResultado = false;
  desenharEnquete(e);

  $('#form-voto').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const marcados = [...document.querySelectorAll('#e-opcoes input:checked')].map((i) => +i.value);
    if (!marcados.length || meusVotos[e.id] || e.encerrada) return;
    marcados.forEach((i) => { e.opcoes[i].votos++; });
    meusVotos[e.id] = marcados;
    salvar();
    desenharEnquete(e, true);
    toast('Voto registrado!');
  });
  $('#form-voto').addEventListener('change', () => { $('#e-votar').disabled = !document.querySelector('#e-opcoes input:checked'); });
  $('#e-ver').addEventListener('click', () => { verResultado = !verResultado; desenharEnquete(e); });

  const link = linkDe(e);
  $('#c-link').value = link;
  $('#c-link').addEventListener('focus', (ev) => ev.target.select());
  $('#c-copiar').addEventListener('click', () => copiar(link, 'Link copiado!'));
  $('#c-zap').href = `https://wa.me/?text=${encodeURIComponent(`📊 ${e.pergunta}\nVote aqui: ${link}`)}`;
  if (navigator.share) { $('#c-nativo').hidden = false; $('#c-nativo').addEventListener('click', () => navigator.share({ title: e.pergunta, text: 'Vote na minha enquete:', url: link }).catch(() => {})); }
  $('#c-resultado').addEventListener('click', () => {
    const t = total(e) || 1;
    const txt = `📊 ${e.pergunta}\n\n` + e.opcoes.map((o) => `${'█'.repeat(Math.round((o.votos / t) * 10)).padEnd(10, '░')} ${Math.round((o.votos / t) * 100)}% ${o.texto} (${o.votos})`).join('\n') + `\n\nTotal: ${plural(total(e), 'voto', 'votos')}`;
    copiar(txt, 'Resultado copiado!');
  });

  $('#g-reabrir').addEventListener('click', () => {
    const v = meusVotos[e.id];
    if (!v) return;
    v.forEach((i) => { e.opcoes[i].votos = Math.max(0, e.opcoes[i].votos - 1); });
    delete meusVotos[e.id]; salvar(); desenharEnquete(e);
  });
  $('#g-encerrar').addEventListener('click', () => { e.encerrada = !e.encerrada; salvar(); desenharEnquete(e); toast(e.encerrada ? 'Votação encerrada' : 'Votação reaberta'); });
  let confirma = false;
  $('#g-excluir').addEventListener('click', (ev) => {
    if (!confirma) { confirma = true; ev.target.textContent = 'Clique de novo para excluir'; setTimeout(() => { confirma = false; ev.target.textContent = 'Excluir enquete'; }, 3000); return; }
    enquetes = enquetes.filter((x) => x !== e); delete meusVotos[e.id]; salvar();
    location.hash = '#/'; toast('Enquete excluída');
  });
}

function desenharEnquete(e, animarVoto = false) {
  const meu = meusVotos[e.id];
  const t = total(e);
  const mostrar = !!meu || e.encerrada || verResultado || (!e.ocultar && t > 0 && verResultado);
  const max = Math.max(...e.opcoes.map((o) => o.votos));
  $('#e-pergunta').textContent = e.pergunta;
  $('#e-meta').innerHTML = `Criada em ${new Date(e.criada).toLocaleDateString('pt-BR')}${e.encerrada ? '<span class="encerrada">encerrada</span>' : ''}`;
  $('#e-dica').textContent = e.encerrada ? 'A votação foi encerrada.' : meu ? 'Obrigado por votar! O resultado atualiza na hora.' : e.multipla ? 'Você pode escolher mais de uma opção.' : 'Escolha uma opção.';
  const form = $('#form-voto');
  form.classList.toggle('resultado', mostrar);
  $('#e-opcoes').innerHTML = e.opcoes.map((o, i) => {
    const pct = t ? Math.round((o.votos / t) * 100) : 0;
    const tipo = e.multipla ? 'checkbox' : 'radio';
    const lider = mostrar && t && o.votos === max;
    return `<li><label class="op ${lider ? 'lider' : ''} ${meu?.includes(i) ? 'meu' : ''}" style="--c:${CORES[i % CORES.length]}">
      <span class="op__barra" data-largura="${mostrar ? pct : 0}"></span>
      ${mostrar ? '' : `<input type="${tipo}" name="voto" value="${i}">`}
      <span class="op__texto">${escapar(o.texto)}</span>
      ${mostrar ? `<span class="op__pct">${pct}%<small>${plural(o.votos, 'voto', 'votos')}</small></span>` : ''}
    </label></li>`;
  }).join('');
  // anima as barras do zero até o valor
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.op__barra').forEach((b) => { b.style.width = b.dataset.largura + '%'; });
  }));
  $('#e-votar').hidden = mostrar;
  $('#e-votar').disabled = true;
  $('#e-ver').hidden = !!meu || e.encerrada || (e.ocultar && !meu);
  $('#e-ver').textContent = verResultado ? 'Voltar para a votação' : 'Ver resultado';
  $('#e-total').innerHTML = `<strong>${plural(t, 'voto', 'votos')}</strong>${e.multipla ? ' · múltipla escolha' : ''}${e.ocultar && !mostrar ? ' · o resultado aparece depois do seu voto' : ''}`;
  if (animarVoto) $('#e-total').classList.add('pulso');
  $('#g-reabrir').hidden = !meu || e.encerrada;
  $('#g-encerrar').textContent = e.encerrada ? 'Reabrir votação' : 'Encerrar votação';
}

/* Link recebido: cria a enquete neste aparelho (se ainda não existir) e abre */
function receberLink(cod) {
  const d = decodificar(cod);
  if (!d) { location.hash = '#/'; toast('Link de enquete inválido'); return; }
  let e = enquetes.find((x) => x.id === d.id);
  if (!e) { enquetes.push(d); salvar(); e = d; }
  location.replace(`#/p/${e.id}`);
}

/* ---------- Roteador ---------- */
function rota() {
  const h = location.hash.slice(1) || '/';
  $('#btn-nova').hidden = h === '/nova';
  if (h === '/nova') telaNova();
  else if (h.startsWith('/p/')) telaEnquete(decodeURIComponent(h.slice(3)));
  else if (h.startsWith('/v/')) receberLink(h.slice(3));
  else telaInicio();
}
addEventListener('hashchange', rota);

/* Atualiza em tempo real quando outra aba vota */
addEventListener('storage', (ev) => {
  if (ev.key !== 'pm_enquetes' && ev.key !== 'pm_votos') return;
  enquetes = banco.ler('pm_enquetes', []); meusVotos = banco.ler('pm_votos', {});
  const h = location.hash.slice(1);
  if (h.startsWith('/p/')) { const e = enquetes.find((x) => x.id === decodeURIComponent(h.slice(3))); if (e) desenharEnquete(e); }
  else if (!h || h === '/') telaInicio();
});

async function copiar(txt, msg) { try { await navigator.clipboard.writeText(txt); toast(msg); } catch { toast('Não foi possível copiar'); } }
let timerToast;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(timerToast); timerToast = setTimeout(() => { t.hidden = true; }, 2600); }

rota();
