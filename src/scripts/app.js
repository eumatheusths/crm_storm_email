// src/scripts/app.js

const app = {
    currentView: 'disparo',
    data: { grupos: [], templates: [], fluxos: [], settings: [] },
    currentItemId: null,

    // TRADUTOR DE ROTAS (Evita erro 404)
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
                fetch('/api/flows').then(r => r.json()), // Agora traz estatísticas
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
        // 2. TELA DE CONFIGURAÇÕES (SMTP)
        else if (app.currentView === 'config') {
            if(!app.data.settings.length) html = '<div class="empty-state">Nenhum servidor configurado. Adicione um novo no painel ao lado.</div>';
            else html = app.data.settings.map(s => `
                <div class="card-item" onclick="window.app.editItem(${s.id})">
                    <div class="card-header">
                        <div class="card-meta">
                            <div class="avatar" style="background:#0ea5e9">S</div>
                            <div>
                                <div class="card-title">${s.name}</div>
                                <div class="card-preview">${s.smtp_host} • ${s.smtp_user}</div>
                            </div>
                        </div>
                        <span class="tag" style="border:1px solid #333; color:#aaa;">Porta ${s.smtp_port}</span>
                    </div>
                </div>
            `).join('');
        }
        // 3. TELA DE FLUXOS (COM ESTATÍSTICAS)
        else if (app.currentView === 'fluxos') {
            // Botão global de processamento
            const processBtn = `
                <div style="margin-bottom:20px; display:flex; justify-content:flex-end;">
                    <button class="btn btn-primary" style="width:auto; background:var(--accent-orange); border:none;" onclick="window.app.processQueue()">
                        ⚙️ Processar Fila Agora
                    </button>
                </div>
            `;

            const list = app.data.fluxos.map(f => {
                // Cálculo de Estatísticas
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

        // FORMULÁRIOS DE CADA TIPO
        if (app.currentView === 'config') {
            const item = app.currentItemId ? app.data.settings.find(x => x.id === app.currentItemId) : { name:'', smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', sender_email:'', smtp_secure:false };
            title.innerText = app.currentItemId ? 'Editar SMTP' : 'Novo Servidor SMTP';
            fields = `
                <div class="form-group"><label>Nome do Perfil</label><input id="c_name" value="${item.name || ''}" placeholder="Nicopel Marketing"></div>
                <div class="form-group"><label>Host (Servidor)</label><input id="c_host" value="${item.smtp_host || ''}" placeholder="smtp.titan.email"></div>
                <div class="form-group"><label>Porta</label><input type="number" id="c_port" value="${item.smtp_port || 587}"></div>
                <div class="form-group"><label>Usuário</label><input id="c_user" value="${item.smtp_user || ''}"></div>
                <div class="form-group"><label>Senha</label><input type="text" id="c_pass" value="${item.smtp_pass || ''}"></div>
                <div class="form-group"><label>Remetente (Opcional)</label><input id="c_sender" value="${item.sender_email || ''}"></div>
                <div class="form-group"><label>Segurança</label><select id="c_secure"><option value="false" ${!item.smtp_secure?'selected':''}>Não (587)</option><option value="true" ${item.smtp_secure?'selected':''}>Sim (465)</option></select></div>
            `;
        }
        else if (app.currentView === 'grupos') {
            const item = app.currentItemId ? app.data.grupos.find(x => x.id === app.currentItemId) : { nome: '', emails: [] };
            title.innerText = 'Editor de Grupo';
            fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><div class="form-group"><label>E-mails</label><textarea id="f_emails" rows="10">${item.emails ? item.emails.join('\n') : ''}</textarea></div>`;
        }
        else if (app.currentView === 'templates') {
            const item = app.currentItemId ? app.data.templates.find(x => x.id === app.currentItemId) : { nome: '', assunto: '', html: '' };
            title.innerText = 'Editor de Template';
            fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><div class="form-group"><label>Assunto</label><input id="f_assunto" value="${item.assunto}"></div><div class="form-group"><label>HTML</label><textarea id="f_html" rows="15" style="font-family:monospace; font-size:12px;">${item.html}</textarea></div>`;
        }
        else if (app.currentView === 'fluxos') {
            const item = app.currentItemId ? app.data.fluxos.find(x => x.id === app.currentItemId) : { nome: '', steps: [] };
            title.innerText = 'Editor de Fluxo';
            const stepsHtml = (item.steps || []).map((s, i) => `
                <div style="background:#151515; padding:10px; border-radius:8px; margin-bottom:8px; border:1px dashed #333;">
                    <div style="font-size:11px; color:#666; margin-bottom:4px;">PASSO ${i+1}</div>
                    <div style="font-weight:600;">Template ID: ${s.templateId}</div>
                    <div style="font-size:12px;">Espera: ${s.delay}h</div>
                </div>
            `).join('');
            fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><label>Sequência</label>${stepsHtml}<div style="padding:10px; background:#222; border-radius:8px; font-size:12px; color:#aaa; margin-top:10px;">Para editar passos, delete este fluxo e crie um novo.</div><input type="hidden" id="f_steps_json" value='${JSON.stringify(item.steps || [])}'>`;
        }

        if(app.currentItemId) {
            fields += `<div style="margin-top:40px; border-top:1px solid var(--card-border); padding-top:20px;"><button class="btn btn-delete" onclick="window.app.deleteCurrent()">Excluir Item</button></div>`;
        }
        container.innerHTML = fields;
    },

    // --- AÇÕES CRUD ---
    saveCurrent: async () => {
        const id = app.currentItemId;
        const method = id ? 'PUT' : 'POST';
        let body = {};

        if (app.currentView === 'config') {
            body = {
                id: id,
                name: document.getElementById('c_name').value,
                host: document.getElementById('c_host').value,
                port: document.getElementById('c_port').value,
                user: document.getElementById('c_user').value,
                pass: document.getElementById('c_pass').value,
                sender: document.getElementById('c_sender').value,
                secure: document.getElementById('c_secure').value === "true"
            };
        }
        else if (app.currentView === 'grupos') {
            body = { id, nome: document.getElementById('f_nome').value, emails: document.getElementById('f_emails').value.split('\n').map(e=>e.trim()).filter(e=>e.includes('@')) };
        } 
        else if (app.currentView === 'templates') {
            body = { id, nome: document.getElementById('f_nome').value, assunto: document.getElementById('f_assunto').value, html: document.getElementById('f_html').value };
        }
        else if (app.currentView === 'fluxos') {
            body = { id, nome: document.getElementById('f_nome').value, steps: JSON.parse(document.getElementById('f_steps_json').value) };
        }

        const endpoint = app.apiMap[app.currentView];

        try {
            const res = await fetch(`/api/${endpoint}`, {
                method: method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            if(res.ok) {
                app.showToast('Salvo com sucesso!', 'success');
                app.fetchData().then(() => app.renderList());
                app.closePanel();
            } else {
                app.showToast('Erro ao salvar no servidor.', 'error');
            }
        } catch(e) { app.showToast('Erro de conexão.', 'error'); }
    },

    deleteCurrent: async () => {
        if(!confirm("Tem certeza?")) return;
        const endpoint = app.apiMap[app.currentView];
        try {
            await fetch(`/api/${endpoint}`, {
                method: 'DELETE',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id: app.currentItemId })
            });
            app.showToast('Item excluído.', 'success');
            app.fetchData().then(() => { app.renderList(); app.closePanel(); });
        } catch(e) { app.showToast('Erro ao excluir.', 'error'); }
    },

    // --- FUNÇÕES DE FLUXO (INICIAR/PROCESSAR) ---
    
    iniciarFluxo: async (flowId) => {
        // Prompt inteligente: Aceita ID ou E-mail
        const choice = prompt(
            "🚀 INICIAR AUTOMAÇÃO\n\n" +
            "• Para enviar para um GRUPO: Digite o ID do grupo (ex: 1, 2)\n" +
            "• Para enviar para UM E-MAIL: Digite o e-mail (ex: cliente@teste.com)\n\n" +
            "Digite abaixo:"
        );
        
        if(!choice) return;

        app.showToast('Adicionando à fila...', 'info');
        
        const isEmail = choice.includes('@');
        
        try {
            const res = await fetch('/api/flows/start', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    flowId, 
                    groupId: isEmail ? null : choice, 
                    singleEmail: isEmail ? choice : null 
                })
            });
            const data = await res.json();
            
            if(res.ok) {
                app.showToast(`Sucesso! ${data.added} contatos na fila.`, 'success');
                // Recarrega para atualizar stats
                setTimeout(() => app.fetchData().then(() => app.renderList()), 2000);
            } else {
                app.showToast('Erro: ' + data.error, 'error');
            }
        } catch(e) { app.showToast('Erro de conexão', 'error'); }
    },

    processQueue: async () => {
        app.showToast('Processando envios pendentes...', 'info');
        try {
            const res = await fetch('/api/flows/process');
            const data = await res.json();
            app.showToast(`Processado! ${data.processed} e-mails enviados.`, 'success');
            // Atualiza estatísticas
            app.fetchData().then(() => app.renderList());
        } catch(e) { app.showToast('Erro ao processar fila', 'error'); }
    },

    // --- DISPARO MANUAL ---
    startSending: async () => {
        const smtpId = document.getElementById('sendSmtp').value;
        const gid = document.getElementById('sendGrupo').value;
        const tid = document.getElementById('sendTemplate').value;
        const avulsos = document.getElementById('sendAvulsos').value;
        
        if(!smtpId) return app.showToast('Selecione um Servidor SMTP!', 'error');

        let list = [];
        if(gid) { const g = app.data.grupos.find(x=>x.id==gid); if(g) list = [...g.emails]; }
        if(avulsos) list = [...list, ...avulsos.split('\n').filter(e=>e.includes('@'))];
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

        // Envia em lotes de 2
        for(let i=0; i<list.length; i+=2) {
            const batch = list.slice(i, i+2);
            
            const promises = batch.map(async (email) => {
                try {
                    // Adiciona tracking pixel também no manual se quiser (opcional)
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
                        console.error("Falha no envio:", data.error);
                        lastError = data.error;
                    }
                } catch (e) {
                    errorCount++;
                    lastError = "Erro de conexão";
                }
            });

            await Promise.all(promises);
            await new Promise(r=>setTimeout(r, 1000));
        }

        btn.disabled = false; 
        btn.innerText = "INICIAR DISPARO";

        if (errorCount > 0) {
            alert(`Envio finalizado com ERROS.\n✅ Sucesso: ${successCount}\n❌ Falhas: ${errorCount}\n\nMotivo da última falha: ${lastError}`);
        } else {
            app.showToast(`Envio concluído! ${successCount} enviados.`, 'success');
        }
    },

    showToast: (msg, type) => {
        const t = document.createElement('div');
        t.className = `toast ${type || ''}`;
        t.innerHTML = `<span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

// Iniciar
document.addEventListener('DOMContentLoaded', app.init);