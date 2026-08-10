// src/scripts/app.js

const app = {
    currentView: 'disparo',
    data: { grupos: [], templates: [], fluxos: [], settings: [] },
    currentItemId: null,
    tempSteps: [], // Variável temporária para edição de fluxos

    // TRADUTOR DE ROTAS (Backend <-> Frontend)
    apiMap: {
        'grupos': 'groups',
        'templates': 'templates',
        'fluxos': 'flows',
        'config': 'settings',
        'disparo': 'send'
    },

    // --- INICIALIZAÇÃO ---
    init: async () => {
        await app.fetchData();
        const view = localStorage.getItem('lastView') || 'disparo';
        const navItem = document.querySelector(`.nav-item[data-target="${view}"]`) || document.querySelector('.nav-item[data-target="disparo"]');
        app.navigate(view, navItem);
        window.app = app; 
    },

    fetchData: async () => {
        try {
            const [g, t, f, s] = await Promise.all([
                fetch('/api/groups').then(r => r.json()),
                fetch('/api/templates').then(r => r.json()),
                fetch('/api/flows').then(r => r.json()), 
                fetch('/api/settings').then(r => r.json())
            ]);
            app.data.grupos = g || [];
            app.data.templates = t || [];
            app.data.fluxos = f || [];
            app.data.settings = s || [];
        } catch (e) { console.error("Erro ao carregar dados:", e); }
    },

    // --- NAVEGAÇÃO ---
    navigate: (view, el) => {
        app.currentView = view;
        localStorage.setItem('lastView', view);
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(el) el.classList.add('active');

        const titles = {
            'disparo': ['Disparo Rápido', 'Envie campanhas em massa'],
            'grupos': ['Grupos', 'Gerencie seus contatos'],
            'templates': ['Templates', 'Modelos de e-mail'],
            'fluxos': ['Fluxos', 'Automação e Estatísticas'],
            'config': ['Servidores SMTP', 'Canais de envio']
        };
        
        if(titles[view]) {
            const titleEl = document.getElementById('pageTitle');
            const subEl = document.getElementById('pageSubtitle');
            if(titleEl) titleEl.innerText = titles[view][0];
            if(subEl) subEl.innerText = titles[view][1];
        }

        app.renderList();
        app.closePanel();
        
        if (view === 'config') app.renderForm(); 
    },

    // --- RENDERIZAÇÃO DAS LISTAS (GRID) ---
    renderList: () => {
        const container = document.getElementById('contentArea');
        if(!container) return;
        let html = '';

        // 1. TELA DE DISPARO MANUAL
        if (app.currentView === 'disparo') {
            const smtps = app.data.settings && app.data.settings.length ? app.data.settings : [];
            let smtpOptions = `<option value="">-- Selecione --</option>`;
            
            if (smtps.length === 0) {
                smtpOptions = `<option value="">⚠️ Configure um SMTP na aba Configurações</option>`;
            } else {
                smtpOptions += smtps.map(s => `<option value="${s.id}">${s.name} (${s.smtp_user})</option>`).join('');
            }

            html = `
                <div class="card-item" style="cursor:default;">
                    <div class="form-group" style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:20px; margin-bottom:20px;">
                        <label style="color:#a78bfa;">🚀 Servidor de Envio (SMTP)</label>
                        <select id="sendSmtp" style="border-color:#7c3aed;">${smtpOptions}</select>
                    </div>

                    <div class="form-group">
                        <label>Grupo de Destino</label>
                        <select id="sendGrupo">
                            <option value="">-- Selecione --</option>
                            ${app.data.grupos.map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ou e-mails avulsos</label>
                        <textarea id="sendAvulsos" rows="3" placeholder="email@exemplo.com"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Template</label>
                        <select id="sendTemplate">${app.data.templates.map(t=>`<option value="${t.id}">${t.nome}</option>`).join('')}</select>
                    </div>
                    <button class="btn btn-primary" id="btnStart" onclick="window.app.startSending()">INICIAR DISPARO</button>
                </div>
            `;
        } 
        // 2. TELA DE CONFIGURAÇÕES (Servidores de envio)
        else if (app.currentView === 'config') {
            if(!app.data.settings.length) html = '<div class="empty-state">Nenhum servidor configurado. Adicione um novo no painel ao lado.</div>';
            else html = app.data.settings.map(s => {
                const isApi = s.provider === 'hostinger_api';
                const subtitle = isApi ? `Hostinger API • ${s.sender_email || ''}` : `${s.smtp_host} • ${s.smtp_user}`;
                const tag = isApi ? 'API' : `Porta ${s.smtp_port}`;
                return `
                <div class="card-item" onclick="window.app.editItem(${s.id})">
                    <div class="card-header">
                        <div class="card-meta">
                            <div class="avatar" style="background:#0ea5e9">S</div>
                            <div>
                                <div class="card-title">${s.name}</div>
                                <div class="card-preview">${subtitle}</div>
                            </div>
                        </div>
                        <span class="tag" style="border:1px solid #333; color:#aaa;">${tag}</span>
                    </div>
                </div>
            `}).join('');
        }
        // 3. TELA DE FLUXOS (COM ESTATÍSTICAS)
        else if (app.currentView === 'fluxos') {
            const processBtn = `
                <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
                    <button class="btn btn-primary" style="width:auto; background:var(--accent-orange); border:none;" onclick="window.app.processQueue()">
                        ⚙️ Processar Fila Agora
                    </button>
                </div>
            `;

            const list = app.data.fluxos.map(f => {
                const sent = parseInt(f.stats?.sent || 0);
                const opened = parseInt(f.stats?.opened || 0);
                const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;

                return `
                <div class="card-item" style="${f.active ? 'border-color:#10b981;' : ''}">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar" style="background:#22c55e">A</div><div><div class="card-title">${f.nome}</div><div class="card-preview">${f.steps ? f.steps.length : 0} passos</div></div></div>
                        <span class="tag orange">${f.active ? 'ATIVO' : 'PARADO'}</span>
                    </div>
                    
                    <div style="margin: 15px 0; background:rgba(255,255,255,0.03); padding:12px; border-radius:8px;">
                        <div style="display:flex; justify-content:space-between; font-size:12px; color:#ccc; margin-bottom:6px;">
                            <span>Abertura: <strong>${openRate}%</strong></span>
                            <span>${opened} de ${sent}</span>
                        </div>
                        <div style="height:6px; background:#333; border-radius:3px; overflow:hidden;">
                            <div style="height:100%; width:${openRate}%; background:linear-gradient(90deg, #10b981, #34d399); transition: width 1s ease;"></div>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary" style="font-size:11px; padding:8px;" onclick="window.app.editItem(${f.id})">EDITAR</button>
                        <button class="btn btn-secondary" style="font-size:11px; padding:8px;" onclick="window.app.iniciarFluxo(${f.id})">▶ INICIAR</button>
                    </div>
                </div>
            `}).join('');
            
            html = processBtn + (list || '<div class="empty-state">Sem fluxos criados.</div>');
        }
        // 4. GRUPOS
        else if (app.currentView === 'grupos') {
            html = app.data.grupos.map(g => `
                <div class="card-item" onclick="window.app.editItem(${g.id})">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar purple-gradient">G</div><div><div class="card-title">${g.nome}</div><div class="card-preview">${g.emails ? g.emails.length : 0} contatos</div></div></div>
                        <span class="tag orange">Lista</span>
                    </div>
                </div>
            `).join('');
        }
        // 5. TEMPLATES
        else if (app.currentView === 'templates') {
            html = app.data.templates.map(t => `
                <div class="card-item" onclick="window.app.editItem(${t.id})">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar" style="background:#333">T</div><div><div class="card-title">${t.nome}</div><div class="card-preview">${t.assunto}</div></div></div>
                        <span class="tag purple">HTML</span>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;
    },

    // --- PAINEL LATERAL (FORMULÁRIOS) ---
    openCreatePanel: () => {
        if(app.currentView === 'disparo') return;
        app.currentItemId = null;
        app.renderForm();
    },

    editItem: (id) => {
        app.currentItemId = id;
        app.renderForm();
    },

    closePanel: () => {
        const panel = document.getElementById('actionPanel');
        if(panel) {
            document.getElementById('defaultPanelContent').style.display = 'block';
            document.getElementById('dynamicForm').style.display = 'none';
            panel.classList.remove('open');
        }
    },

    renderForm: () => {
        const container = document.getElementById('formFields');
        const title = document.getElementById('formTitle');
        let fields = '';
        
        document.getElementById('defaultPanelContent').style.display = 'none';
        document.getElementById('dynamicForm').style.display = 'block';
        document.getElementById('actionPanel').classList.add('open');

        // FORMULÁRIOS
        if (app.currentView === 'config') {
            const item = app.currentItemId ? app.data.settings.find(x => x.id === app.currentItemId) : { name:'', provider:'hostinger_api', smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', sender_email:'', sender_name:'', smtp_secure:false, api_token:'' };
            const provider = item.provider || 'hostinger_api';
            title.innerText = app.currentItemId ? 'Editar Servidor' : 'Novo Servidor de Envio';
            fields = `
                <div class="form-group"><label>Nome do Perfil</label><input id="c_name" value="${item.name || ''}" placeholder="Storm Mídia"></div>
                <div class="form-group">
                    <label>Como enviar</label>
                    <select id="c_provider" onchange="window.app.toggleProviderFields(this.value)">
                        <option value="hostinger_api" ${provider==='hostinger_api'?'selected':''}>API de E-mail da Hostinger</option>
                        <option value="smtp" ${provider==='smtp'?'selected':''}>SMTP</option>
                    </select>
                </div>
                <div class="form-group"><label>E-mail Remetente</label><input id="c_sender" value="${item.sender_email || ''}" placeholder="contato@stormmidia.com.br"></div>
                <div class="form-group"><label>Nome de Exibição do Remetente</label><input id="c_sendername" value="${item.sender_name || ''}" placeholder="Storm Mídia"></div>

                <div id="apiFields" style="display:${provider==='hostinger_api'?'block':'none'};">
                    <div class="form-group">
                        <label>Token da API (Hostinger → E-mails → Desenvolvedores → Chaves de API)</label>
                        <input type="text" id="c_apitoken" value="${item.api_token || ''}" placeholder="Cole o token aqui">
                        <small style="color:#666; font-size:11px;">O token precisa ter acesso à caixa acima. Ao salvar, validamos com a Hostinger.</small>
                    </div>
                </div>

                <div id="smtpFields" style="display:${provider==='smtp'?'block':'none'};">
                    <div class="form-group"><label>Host (Servidor)</label><input id="c_host" value="${item.smtp_host || ''}" placeholder="smtp.hostinger.com"></div>
                    <div class="form-group"><label>Porta</label><input type="number" id="c_port" value="${item.smtp_port || 587}"></div>
                    <div class="form-group"><label>Usuário</label><input id="c_user" value="${item.smtp_user || ''}"></div>
                    <div class="form-group"><label>Senha</label><input type="text" id="c_pass" value="${item.smtp_pass || ''}"></div>
                    <div class="form-group"><label>Segurança</label><select id="c_secure"><option value="false" ${!item.smtp_secure?'selected':''}>Não (587)</option><option value="true" ${item.smtp_secure?'selected':''}>Sim (465)</option></select></div>
                </div>
            `;
        }
        else if (app.currentView === 'grupos') {
            const item = app.currentItemId ? app.data.grupos.find(x => x.id === app.currentItemId) : { nome: '', emails: [] };
            title.innerText = 'Editor de Grupo';
            fields = `
                <div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div>
                <div style="margin-bottom:20px; padding:15px; border:1px dashed rgba(255,255,255,0.2); border-radius:12px; background:rgba(255,255,255,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="margin:0; color:#a78bfa;">📂 Importar CSV</label>
                        <a href="#" onclick="window.app.downloadTemplate()" style="font-size:11px; color:#fff; text-decoration:underline;">Baixar Modelo</a>
                    </div>
                    <input type="file" id="importFile" accept=".csv, .txt" class="glass-input" style="margin-bottom:10px; padding:10px;">
                    <button class="btn btn-secondary" onclick="window.app.processImport()">Ler Arquivo</button>
                </div>
                <div class="form-group">
                    <label>E-mails</label><textarea id="f_emails" rows="10">${item.emails ? item.emails.join('\n') : ''}</textarea>
                    <small style="color:#666; font-size:11px;">Total: <span id="emailCount">${item.emails ? item.emails.length : 0}</span></small>
                </div>
            `;
        }
        else if (app.currentView === 'templates') {
            const item = app.currentItemId ? app.data.templates.find(x => x.id === app.currentItemId) : { nome: '', assunto: '', html: '' };
            title.innerText = 'Editor de Template';
            fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><div class="form-group"><label>Assunto</label><input id="f_assunto" value="${item.assunto}"></div><div class="form-group"><label>HTML</label><textarea id="f_html" rows="15" style="font-family:monospace; font-size:12px;">${item.html}</textarea></div>`;
        }
        else if (app.currentView === 'fluxos') {
            const item = app.currentItemId ? app.data.fluxos.find(x => x.id === app.currentItemId) : { nome: '', steps: [] };
            title.innerText = 'Editor de Fluxo';
            app.tempSteps = item.steps ? JSON.parse(JSON.stringify(item.steps)) : [];

            fields = `
                <div class="form-group"><label>Nome da Campanha</label><input id="f_nome" value="${item.nome}"></div>
                <div style="border-top:1px solid rgba(255,255,255,0.1); margin:20px 0; padding-top:10px;">
                    <label style="color:#a78bfa; margin-bottom:15px;">LINHA DO TEMPO</label>
                    <div id="stepsList"></div>
                </div>
                <button class="btn btn-secondary" style="border-style:dashed; margin-bottom:20px;" onclick="window.app.addStep()">+ Adicionar E-mail</button>
            `;
            setTimeout(() => app.renderStepsList(), 50);
        }

        if(app.currentItemId) {
            fields += `<div style="margin-top:40px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1);"><button class="btn btn-delete" onclick="window.app.deleteCurrent()">Excluir Item</button></div>`;
        }
        container.innerHTML = fields;
    },

    // --- IMPORTAÇÃO DE CSV ---
    downloadTemplate: () => {
        const csvContent = "data:text/csv;charset=utf-8,email\ncliente1@exemplo.com\ncliente2@exemplo.com";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_importacao_nicopel.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    processImport: () => {
        const input = document.getElementById('importFile');
        if (!input.files || !input.files[0]) return app.showToast("Selecione um arquivo .csv", "error");

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            const rawEmails = text.split(/[\n,;]+/);
            const validEmails = rawEmails.map(email => email.trim()).filter(email => email.includes('@') && !email.includes('email'));
            const textArea = document.getElementById('f_emails');
            const currentVal = textArea.value.trim();
            
            if(currentVal) textArea.value = currentVal + '\n' + validEmails.join('\n');
            else textArea.value = validEmails.join('\n');
            
            const total = document.getElementById('f_emails').value.split('\n').filter(e=>e.trim()).length;
            document.getElementById('emailCount').innerText = total;
            app.showToast(`${validEmails.length} e-mails importados!`, "success");
        };
        reader.readAsText(input.files[0]);
    },

    // --- FUNÇÕES DE FLUXO VISUAL ---
    renderStepsList: () => {
        const listDiv = document.getElementById('stepsList');
        if(!listDiv) return;
        const html = app.tempSteps.map((step, index) => {
            const templateOptions = `<option value="">Selecione...</option>` + app.data.templates.map(t => `<option value="${t.id}" ${t.id == step.templateId ? 'selected' : ''}>${t.nome}</option>`).join('');
            const unit = step.unit || 'hours'; 
            return `
            <div style="position:relative; padding-left:20px; margin-bottom:20px; border-left: 2px solid #333;">
                <div style="position:absolute; left:-6px; top:0; width:10px; height:10px; border-radius:50%; background:${index===0 ? '#10b981' : '#7c3aed'};"></div>
                <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                        <span style="font-size:11px; font-weight:700; color:#aaa;">ETAPA ${index + 1}</span>
                        <button style="background:none; border:none; color:#ef4444; cursor:pointer;" onclick="window.app.removeStep(${index})">✕</button>
                    </div>
                    <div class="form-group" style="margin-bottom:10px;">
                        <select onchange="window.app.updateStep(${index}, 'templateId', this.value)" style="margin-bottom:0;">${templateOptions}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Esperar após o anterior:</label>
                        <div style="display:flex; gap:10px;">
                            <input type="number" value="${step.delay}" onchange="window.app.updateStep(${index}, 'delay', this.value)" style="margin-bottom:0; width:80px;">
                            <select onchange="window.app.updateStep(${index}, 'unit', this.value)" style="margin-bottom:0; width:110px;">
                                <option value="minutes" ${unit==='minutes'?'selected':''}>Minutos</option>
                                <option value="hours" ${unit==='hours'?'selected':''}>Horas</option>
                                <option value="days" ${unit==='days'?'selected':''}>Dias</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
        listDiv.innerHTML = html;
    },

    toggleProviderFields: (provider) => {
        document.getElementById('apiFields').style.display = provider === 'hostinger_api' ? 'block' : 'none';
        document.getElementById('smtpFields').style.display = provider === 'smtp' ? 'block' : 'none';
    },

    addStep: () => { app.tempSteps.push({ templateId: "", delay: 5, unit: 'minutes' }); app.renderStepsList(); },
    removeStep: (i) => { app.tempSteps.splice(i, 1); app.renderStepsList(); },
    updateStep: (i, f, v) => { app.tempSteps[i][f] = v; },

    // --- SALVAR ---
    saveCurrent: async () => {
        const id = app.currentItemId;
        const method = id ? 'PUT' : 'POST';
        let body = {};

        if (app.currentView === 'fluxos') {
            const nome = document.getElementById('f_nome').value;
            if (!nome || app.tempSteps.length === 0) return app.showToast('Preencha os dados', 'error');
            body = { id, nome, steps: app.tempSteps };
        }
        else if (app.currentView === 'config') {
            const provider = document.getElementById('c_provider').value;
            body = {
                id,
                name: document.getElementById('c_name').value,
                provider,
                sender: document.getElementById('c_sender').value,
                senderName: document.getElementById('c_sendername').value,
            };
            if (provider === 'hostinger_api') {
                body.apiToken = document.getElementById('c_apitoken').value;
            } else {
                body.host = document.getElementById('c_host').value;
                body.port = document.getElementById('c_port').value;
                body.user = document.getElementById('c_user').value;
                body.pass = document.getElementById('c_pass').value;
                body.secure = document.getElementById('c_secure').value === "true";
            }
        }
        else if (app.currentView === 'grupos') {
            body = { id, nome: document.getElementById('f_nome').value, emails: document.getElementById('f_emails').value.split('\n').map(e=>e.trim()).filter(e=>e.includes('@')) };
        } 
        else if (app.currentView === 'templates') {
            body = { id, nome: document.getElementById('f_nome').value, assunto: document.getElementById('f_assunto').value, html: document.getElementById('f_html').value };
        }

        const endpoint = app.apiMap[app.currentView];
        try {
            const res = await fetch(`/api/${endpoint}`, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
            const data = await res.json().catch(() => ({}));
            if(res.ok) { app.showToast('Salvo!', 'success'); app.fetchData().then(() => app.renderList()); app.closePanel(); }
            else app.showToast(data.error || 'Erro ao salvar.', 'error');
        } catch(e) { app.showToast('Erro conexão.', 'error'); }
    },

    deleteCurrent: async (idToDelete) => {
        if(!confirm("Tem certeza?")) return;
        const id = idToDelete || app.currentItemId;
        const endpoint = app.apiMap[app.currentView];
        try {
            await fetch(`/api/${endpoint}`, { method: 'DELETE', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }) });
            app.showToast('Excluído.', 'success'); app.fetchData().then(() => { app.renderList(); app.closePanel(); });
        } catch(e) { app.showToast('Erro.', 'error'); }
    },

    iniciarFluxo: async (flowId) => {
        const choice = prompt("INICIAR AUTOMAÇÃO:\n\n1. ID do Grupo\n2. E-mail Único\n\nDigite:");
        if(!choice) return;
        app.showToast('Adicionando...', 'info');
        const isEmail = choice.includes('@');
        try {
            const res = await fetch('/api/flows/start', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ flowId, groupId: isEmail ? null : choice, singleEmail: isEmail ? choice : null }) });
            const data = await res.json();
            if(res.ok) { app.showToast(`Sucesso! ${data.added} na fila.`, 'success'); setTimeout(() => app.fetchData().then(() => app.renderList()), 1500); }
            else app.showToast('Erro: ' + data.error, 'error');
        } catch(e) { app.showToast('Erro conexão', 'error'); }
    },

    processQueue: async () => {
        app.showToast('Processando...', 'info');
        try {
            const res = await fetch('/api/flows/process');
            const data = await res.json();
            app.showToast(`Processado! ${data.processed} enviados.`, 'success');
            app.fetchData().then(() => app.renderList());
        } catch(e) { app.showToast('Erro processamento', 'error'); }
    },

    startSending: async () => {
        const smtpId = document.getElementById('sendSmtp').value;
        const gid = document.getElementById('sendGrupo').value;
        const tid = document.getElementById('sendTemplate').value;
        const avulsos = document.getElementById('sendAvulsos').value;
        
        if(!smtpId) return app.showToast('Selecione um Servidor SMTP!', 'error');

        let list = [];
        if(gid) { const g = app.data.grupos.find(x=>x.id==gid); if(g) list = [...g.emails]; }
        if(avulsos) list = [...list, ...avulsos.split('\n').filter(e=>e.trim().includes('@'))];
        list = [...new Set(list)];

        if(!list.length) return app.showToast('Sem e-mails para enviar', 'error');
        if(!confirm(`Enviar para ${list.length} pessoas?`)) return;

        const tmpl = app.data.templates.find(x=>x.id==tid);
        const subj = tmpl ? tmpl.assunto : 'Aviso';
        const html = tmpl ? tmpl.html : 'Olá';

        app.showToast(`Iniciando envio para ${list.length} contatos...`, 'success');
        const btn = document.getElementById('btnStart');
        btn.disabled = true; 
        btn.innerText = "ENVIANDO...";
        
        let successCount = 0;
        let errorCount = 0;
        let lastError = "";

        // --- CONFIGURAÇÃO SEGURA PARA OUTLOOK/TITAN ---
        const BATCH_SIZE = 5; // Envia 5 emails de uma vez
        const DELAY_MS = 2000; // Espera 2 segundos (segurança)

        for(let i=0; i<list.length; i+=BATCH_SIZE) {
            const batch = list.slice(i, i+BATCH_SIZE);
            
            if(i > 0 && i % 50 === 0) app.showToast(`Enviados ${i} de ${list.length}...`, 'info');

            await Promise.all(batch.map(async (email) => {
                try {
                    const res = await fetch('/api/send', {
                        method:'POST', 
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({email, subject:subj, html, smtpId})
                    });
                    const data = await res.json();
                    
                    if (res.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                        lastError = data.error || "Erro desconhecido";
                        console.error("Falha no envio:", lastError);
                    }
                } catch (err) {
                    errorCount++;
                    lastError = "Erro de conexão";
                    console.error(err);
                }
            }));
            await new Promise(r=>setTimeout(r, DELAY_MS));
        }

        btn.disabled = false; 
        btn.innerText = "INICIAR DISPARO";

        if (errorCount > 0) {
            alert(`Fim com erros.\n✅ Sucesso: ${successCount}\n❌ Falhas: ${errorCount}\n\nMotivo da última falha: ${lastError}`);
        } else {
            app.showToast(`Envio concluído! ${successCount} enviados.`, 'success');
        }
    },

    logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    },

    showToast: (msg, type) => {
        const t = document.createElement('div');
        t.className = `toast ${type || ''}`;
        t.innerHTML = `<span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', app.init);