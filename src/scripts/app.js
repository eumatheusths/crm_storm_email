// src/scripts/app.js

const app = {
    currentView: 'disparo',
    data: { grupos: [], templates: [], fluxos: [], settings: [] },
    currentItemId: null,

    // --- TRADUTOR DE ROTAS (CORREÇÃO DO ERRO 404) ---
    // Mapeia o nome da tela (Visual) para o nome do arquivo da API (Código)
    apiMap: {
        'grupos': 'groups',       // Tela 'grupos' -> arquivo 'groups.ts'
        'templates': 'templates', // Tela 'templates' -> arquivo 'templates.ts'
        'fluxos': 'flows',        // Tela 'fluxos' -> arquivo 'flows.ts'
        'config': 'settings'      // Tela 'config' -> arquivo 'settings.ts'
    },

    init: async () => {
        await app.fetchData();
        const view = localStorage.getItem('lastView') || 'disparo';
        // Garante que o elemento existe antes de navegar
        const navItem = document.querySelector(`.nav-item[data-target="${view}"]`) || document.querySelector('.nav-item[data-target="disparo"]');
        app.navigate(view, navItem);
        window.app = app; 
    },

    fetchData: async () => {
        try {
            // Aqui usamos os nomes em inglês direto, pois são fixos
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
        } catch (e) { console.error("Erro dados:", e); }
    },

    navigate: (view, el) => {
        app.currentView = view;
        localStorage.setItem('lastView', view);
        
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(el) el.classList.add('active');

        const titles = {
            'disparo': ['Disparo Rápido', 'Envie campanhas em massa'],
            'grupos': ['Grupos', 'Gerencie seus contatos'],
            'templates': ['Templates', 'Modelos de e-mail'],
            'fluxos': ['Fluxos', 'Automação de envio'],
            'config': ['Servidores SMTP', 'Configure seus canais de envio']
        };
        
        if(titles[view]) {
            const titleEl = document.getElementById('pageTitle');
            const subEl = document.getElementById('pageSubtitle');
            if(titleEl) titleEl.innerText = titles[view][0];
            if(subEl) subEl.innerText = titles[view][1];
        }

        app.renderList();
        app.closePanel();
        
        if (view === 'config') app.loadConfig();
    },

    renderList: () => {
        const container = document.getElementById('contentArea');
        if(!container) return;
        let html = '';

        if (app.currentView === 'disparo') {
            const smtps = app.data.settings && app.data.settings.length ? app.data.settings : [{id:'', name:'⚠️ Configure um SMTP primeiro'}];
            
            html = `
                <div class="card-item" style="cursor:default;">
                    <div class="form-group" style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:20px; margin-bottom:20px;">
                        <label style="color:#a78bfa;">🚀 Servidor de Envio (SMTP)</label>
                        <select id="sendSmtp" style="border-color:#7c3aed;">
                            ${smtps.map(s => `<option value="${s.id}">${s.name} ${s.smtp_user ? '('+s.smtp_user+')' : ''}</option>`).join('')}
                        </select>
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
                    <button class="btn btn-primary" onclick="window.app.startSending()">INICIAR DISPARO</button>
                </div>
            `;
        } 
        else if (app.currentView === 'config') {
            if(!app.data.settings.length) html = '<div class="empty-state">Nenhum servidor configurado. Adicione um novo.</div>';
            else html = app.data.settings.map(s => `
                <div class="card-item" onclick="window.app.editItem(${s.id})">
                    <div class="card-header">
                        <div class="card-meta">
                            <div class="avatar" style="background:#0ea5e9"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg></div>
                            <div>
                                <div class="card-title">${s.name}</div>
                                <div class="card-preview">${s.smtp_host} • ${s.sender_email || s.smtp_user}</div>
                            </div>
                        </div>
                        <span class="tag" style="border:1px solid #333; color:#aaa;">${s.smtp_port}</span>
                    </div>
                </div>
            `).join('');
        }
        else if (app.currentView === 'grupos') {
            if(!app.data.grupos.length) html = '<div class="empty-state">Sem grupos.</div>';
            else html = app.data.grupos.map(g => `
                <div class="card-item" onclick="window.app.editItem(${g.id})">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar purple-gradient">G</div><div><div class="card-title">${g.nome}</div><div class="card-preview">${g.emails ? g.emails.length : 0} contatos</div></div></div>
                        <span class="tag orange">Lista</span>
                    </div>
                </div>
            `).join('');
        }
        else if (app.currentView === 'templates') {
            if(!app.data.templates.length) html = '<div class="empty-state">Sem templates.</div>';
            else html = app.data.templates.map(t => `
                <div class="card-item" onclick="window.app.editItem(${t.id})">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar" style="background:#333">T</div><div><div class="card-title">${t.nome}</div><div class="card-preview">${t.assunto}</div></div></div>
                        <span class="tag purple">HTML</span>
                    </div>
                </div>
            `).join('');
        }
        else if (app.currentView === 'fluxos') {
            if(!app.data.fluxos.length) html = '<div class="empty-state">Sem fluxos.</div>';
            else html = app.data.fluxos.map(f => `
                <div class="card-item" onclick="window.app.editItem(${f.id})">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar" style="background:#22c55e">A</div><div><div class="card-title">${f.nome}</div><div class="card-preview">${f.steps ? f.steps.length : 0} passos</div></div></div>
                        <span class="tag orange">Auto</span>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;
    },

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

        if (app.currentView === 'config') {
            const item = app.currentItemId ? app.data.settings.find(x => x.id === app.currentItemId) : { name:'', smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', sender_email:'', smtp_secure:false };
            title.innerText = app.currentItemId ? 'Editar SMTP' : 'Novo Servidor SMTP';
            fields = `
                <div class="form-group"><label>Nome do Perfil</label><input id="c_name" value="${item.name || ''}" placeholder="Nicopel Marketing"></div>
                <div class="form-group"><label>Host</label><input id="c_host" value="${item.smtp_host || ''}" placeholder="smtp.titan.email"></div>
                <div class="form-group"><label>Porta</label><input type="number" id="c_port" value="${item.smtp_port || 587}"></div>
                <div class="form-group"><label>Usuário</label><input id="c_user" value="${item.smtp_user || ''}"></div>
                <div class="form-group"><label>Senha</label><input type="password" id="c_pass" value="${item.smtp_pass || ''}"></div>
                <div class="form-group"><label>Remetente</label><input id="c_sender" value="${item.sender_email || ''}"></div>
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
            fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><input type="hidden" id="f_steps_json" value='${JSON.stringify(item.steps||[])}'><div style="padding:10px; background:#222; border-radius:8px; font-size:12px; color:#aaa;">Edição simplificada. Delete para recriar.</div>`;
        }

        if(app.currentItemId) {
            fields += `<div style="margin-top:40px; border-top:1px solid var(--card-border); padding-top:20px;"><button class="btn btn-delete" onclick="window.app.deleteCurrent()">Excluir Item</button></div>`;
        }
        container.innerHTML = fields;
    },

    saveCurrent: async () => {
        const id = app.currentItemId;
        const method = id ? 'PUT' : 'POST';
        let body = {};

        // Coleta dados
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

        // --- CORREÇÃO DO ENDPOINT ---
        // Usa o mapa para converter 'grupos' -> 'groups', 'fluxos' -> 'flows', etc.
        const endpointName = app.apiMap[app.currentView]; 
        
        if (!endpointName) {
            app.showToast(`Erro interno: Rota ${app.currentView} não mapeada.`, 'error');
            return;
        }

        try {
            const res = await fetch(`/api/${endpointName}`, {
                method: method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            
            if(res.ok) {
                app.showToast('Salvo com sucesso!', 'success');
                app.fetchData().then(() => app.renderList());
                app.closePanel();
            } else {
                app.showToast('Erro ao salvar.', 'error');
            }
        } catch (e) { app.showToast('Erro de conexão.', 'error'); }
    },

    deleteCurrent: async () => {
        if(!confirm("Tem certeza?")) return;
        
        // --- CORREÇÃO DO ENDPOINT NA DELEÇÃO TAMBÉM ---
        const endpointName = app.apiMap[app.currentView];

        await fetch(`/api/${endpointName}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: app.currentItemId })
        });
        app.showToast('Item excluído.', 'success');
        app.fetchData().then(() => { app.renderList(); app.closePanel(); });
    },

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

        app.showToast('Iniciando envio...', 'success');
        
        for(let i=0; i<list.length; i+=5) {
            const batch = list.slice(i, i+5);
            await Promise.all(batch.map(email => 
                fetch('/api/send', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({email, subject:subj, html, smtpId})
                })
            ));
            await new Promise(r=>setTimeout(r, 1000));
        }
        app.showToast('Envio concluído!', 'success');
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