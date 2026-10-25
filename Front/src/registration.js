const interests = [
  ['gpu', 'Placas de vídeo'], ['cpu', 'Processadores'], ['memory', 'Memória RAM'],
  ['drive', 'Armazenamento'], ['wifi', 'Redes'], ['mouse', 'Periféricos']
];

export function registrationView({ icon, escape, user }) {
  return `
    <div class="registration-page">
      <header class="registration-header">
        <a href="#feed" class="brand" aria-label="Circuito, início">
          <span class="brand-mark">${icon('cpu')}</span>circuito<span class="brand-dot">.</span>
        </a>
        <div class="registration-header-links"><button class="registration-back" data-page="feed">${icon('arrow')} Explorar</button><span>Já tem um perfil?</span><button class="registration-login" data-auth="login">Entrar ${icon('arrow')}</button></div>
      </header>
      <main id="main" class="registration-layout" tabindex="-1">
        <section class="registration-story" aria-labelledby="registration-story-title">
          <span class="registration-kicker"><span></span> SUA PRÓXIMA CONEXÃO COMEÇA AQUI</span>
          <h2 id="registration-story-title">Boas soluções <br>começam com<br><em>boas conexões.</em></h2>
          <p>Tem quem entenda de peças. Tem quem conecte as ideias. Aqui, você encontra os dois.</p>
          <div class="registration-visual" aria-hidden="true">
            <div class="registration-orbit orbit-outer"></div>
            <div class="registration-orbit orbit-inner"></div>
            <div class="registration-core">${icon('cpu')}<span>CONECTE SEU CONHECIMENTO</span></div>
            <span class="registration-node registration-node-gpu">${icon('gpu')}</span>
            <span class="registration-node registration-node-chat">${icon('chat')}</span>
            <span class="registration-node registration-node-check">${icon('check')}</span>
            <span class="registration-spark spark-one"></span><span class="registration-spark spark-two"></span>
            <span class="registration-floating-label">${icon('check')} Mais uma peça no circuito.</span>
          </div>
          <ul class="registration-benefits">
            <li><span>${icon('chat')}</span><div><strong>Nenhuma dúvida é pequena demais.</strong><p>Encontre pessoas que já passaram pelo mesmo desafio.</p></div></li>
            <li><span>${icon('bolt')}</span><div><strong>Aprenda algo. Compartilhe outro tanto.</strong><p>Cada diagnóstico pode virar a próxima boa solução.</p></div></li>
          </ul>
          <div class="registration-story-footer">Conecte. Resolva. Evolua.<span>Esse é o nosso circuito.</span></div>
        </section>
        <section class="registration-form-panel" aria-labelledby="registration-title">
          <ol class="registration-progress" aria-label="Etapas do cadastro">
            <li id="registration-progress-1" aria-current="step"><span>01</span> Seu perfil</li><li class="registration-progress-line" aria-hidden="true"></li><li id="registration-progress-2"><span>02</span> Seus interesses</li>
          </ol>
          <div class="registration-form-top"><span class="registration-step" id="registration-step-label">O PRIMEIRO PASSO É SE APRESENTAR</span><span class="registration-local">Demonstração</span></div>
          <h1 id="registration-title" tabindex="-1">Seu lugar é aqui<span>.</span></h1>
          <p class="registration-intro" id="registration-intro">Conte um pouco sobre você.<br>O próximo insight pode começar com o seu nome.</p>
          <form id="registration-form" novalidate>
            <div id="registration-identity-step">
            <div class="registration-field">
              <label for="registration-name">Como podemos chamar você?</label>
              <input id="registration-name" name="name" type="text" autocomplete="name" placeholder="Seu nome ou apelido" minlength="2" maxlength="70" required value="${escape(user?.name || '')}" aria-describedby="registration-name-error">
              <p class="registration-error" id="registration-name-error" aria-live="polite"></p>
            </div>
            <div class="registration-field">
              <label for="registration-email">Qual é o seu e-mail?</label>
              <input id="registration-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@exemplo.com" required maxlength="120" value="${escape(user?.email || '')}" aria-describedby="registration-email-hint registration-email-error">
              <small id="registration-email-hint">Seu e-mail não aparece no perfil público.</small>
              <p class="registration-error" id="registration-email-error" aria-live="polite"></p>
            </div>
            <div class="registration-preview-caption">UMA PRÉVIA DO SEU PERFIL ${icon('down')}</div>
            <div class="registration-avatar-preview"><span id="registration-initials" aria-hidden="true">${icon('users')}</span><div><strong id="registration-preview-name">Seu nome por aqui</strong><small>Novo membro · Pronto para conectar</small></div><span class="registration-preview-badge">${icon('bolt')}</span></div>
            </div>
            <div id="registration-preferences-step" hidden>
            <div class="registration-field">
              <label for="registration-level">Sua experiência com hardware <span class="registration-optional">Opcional</span></label>
              <select id="registration-level" name="level">
                <option value="">Todo mundo começa de algum lugar</option>
                <option>Estou começando</option><option>Entusiasta de hardware</option><option>Trabalho com tecnologia</option>
              </select>
            </div>
            <fieldset class="registration-interests">
              <legend>Quais assuntos você curte?</legend>
              <p>Escolha quantos quiser. <span id="registration-interest-count" aria-live="polite">Nenhum selecionado</span></p>
              <div class="registration-interest-grid">${interests.map(([glyph, name]) => `<label class="registration-interest"><input type="checkbox" name="interests" value="${name}"><span>${icon(glyph)}${name}${icon('check', 'interest-check')}</span></label>`).join('')}</div>
            </fieldset>
            <div class="registration-preference-tip">${icon('users')}<p>Do primeiro parafuso ao diagnóstico avançado, tem espaço para todo mundo.</p></div>
            </div>
            <div class="registration-demo-note">${icon('box')}<p>Perfil de demonstração, salvo neste navegador.<br>Sem senha e sem envio de e-mails.</p></div>
            <div class="registration-form-actions"><button id="registration-previous" type="button" hidden aria-label="Voltar para seus dados">${icon('arrow')}</button><button type="submit" class="registration-submit" id="registration-submit">Continuar ${icon('arrow')}</button></div>
            <div class="registration-bottom-line"><span id="registration-bottom-note">Dois passos. Um mundo de trocas.</span><button type="button" id="registration-skip" hidden>Decidir depois</button></div>
          </form>
        </section>
      </main>
      <footer class="registration-footer"><span><span class="online-dot"></span> Feito para quem pergunta, aprende e compartilha.</span><span>© ${new Date().getFullYear()} Circuito · Conhecimento que conecta.</span></footer>
    </div>`;
}

export function bindRegistration(onSubmit) {
  const form = document.querySelector('#registration-form');
  const name = form.elements.name;
  const email = form.elements.email;
  const preview = document.querySelector('#registration-initials');
  const defaultAvatar = preview.innerHTML;
  const submit = document.querySelector('#registration-submit');
  const submitArrow = submit.querySelector('svg').outerHTML;
  const previous = document.querySelector('#registration-previous');
  const skip = document.querySelector('#registration-skip');
  let step = 1;

  function validate(field) {
    const value = field.value.trim();
    let error = '';
    if (field === name && value.length < 2) error = 'Conte como podemos chamar você, com pelo menos 2 caracteres.';
    if (field === email && (!value || !field.validity.valid)) error = 'Informe um e-mail válido, como voce@exemplo.com.';
    field.setAttribute('aria-invalid', String(!!error));
    document.querySelector(`#${field.id}-error`).textContent = error;
    return !error;
  }

  function updatePreview() {
    const value = name.value.trim();
    document.querySelector('#registration-preview-name').textContent = value || 'Seu nome por aqui';
    if (value) preview.textContent = value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR');
    else preview.innerHTML = defaultAvatar;
  }

  for (const field of [name, email]) {
    field.addEventListener('blur', () => validate(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  }
  name.addEventListener('input', updatePreview);
  const selectedInterests = new Set(userInterests());
  function userInterests() {
    // The rendered form keeps selections in its native controls between steps.
    return [...form.querySelectorAll('[name=interests]:checked')].map(input => input.value);
  }
  form.querySelectorAll('[name=interests]').forEach(input => {
    input.addEventListener('change', () => {
      input.checked ? selectedInterests.add(input.value) : selectedInterests.delete(input.value);
      const count = selectedInterests.size;
      document.querySelector('#registration-interest-count').textContent = count ? `${count} ${count === 1 ? 'selecionado' : 'selecionados'}` : 'Nenhum selecionado';
    });
  });
  function setStep(next) {
    step = next;
    document.querySelector('#registration-identity-step').hidden = step !== 1;
    document.querySelector('#registration-preferences-step').hidden = step !== 2;
    document.querySelector('#registration-progress-1').toggleAttribute('data-complete', step === 2);
    for (const number of [1, 2]) {
      const item = document.querySelector(`#registration-progress-${number}`);
      if (number === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
    document.querySelector('#registration-step-label').textContent = step === 1 ? 'O PRIMEIRO PASSO É SE APRESENTAR' : 'CADA CONEXÃO TEM O SEU JEITO';
    document.querySelector('#registration-title').textContent = step === 1 ? 'Seu lugar é aqui.' : 'Agora, do seu jeito.';
    document.querySelector('#registration-intro').textContent = step === 1 ? 'Conte um pouco sobre você. O próximo insight pode começar com o seu nome.' : 'Do que você gosta de aprender e conversar? Essa parte é opcional, fique à vontade.';
    submit.innerHTML = `${step === 1 ? 'Continuar' : 'Criar meu perfil'} ${submitArrow}`;
    previous.hidden = skip.hidden = step !== 2;
    document.querySelector('#registration-bottom-note').textContent = step === 1 ? 'Dois passos. Um mundo de trocas.' : 'Você pode começar sem escolher interesses.';
    document.querySelector('#registration-title').focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 650px)').matches) document.querySelector('.registration-form-panel').scrollIntoView({ block: 'start' });
  }
  previous.addEventListener('click', () => setStep(1));
  skip.addEventListener('click', () => onSubmit({ name: name.value.trim(), email: email.value.trim(), level: '', interests: [] }));
  updatePreview();
  form.addEventListener('submit', event => {
    event.preventDefault();
    email.value = email.value.trim();
    const nameValid = validate(name);
    const emailValid = validate(email);
    if (!nameValid || !emailValid) {
      if (step !== 1) setStep(1);
      (!nameValid ? name : email).focus();
      return;
    }
    if (step === 1) { setStep(2); return; }
    const data = new FormData(form);
    onSubmit({ name: name.value.trim(), email: email.value, level: data.get('level'), interests: data.getAll('interests') });
  });
}
