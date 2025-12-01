// src/scripts/app.js

// Estado Global
const app = {
    currentView: 'disparo',
    data: { grupos: [], templates: [], fluxos: [] },
    currentItemId: null,

    // Inicialização
    init: async () => {
        await app.fetchData();
        // Tenta recuperar a tela anterior ou vai para disparo
        const view = localStorage.getItem('lastView') || 'disparo';
        const navItem = document.querySelector(`.nav-item[data-target="${view}"]`);
        app.navigate(view, navItem);
        
        // Listeners globais para os botões do HTML
        window.app = app; 
    },

    fetchData: async () => {
        try {
            const [g, t, f] = await Promise.all([
                fetch('/api/groups').then(r => r.json()),
                fetch('/api/templates').then(r => r.json()),
                fetch('/api/flows').then(r => r.json())
            ]);
            app.data.grupos = g;
            app.data.templates = t;
            app.data.fluxos = f;
        } catch (e) { console.error("Erro ao buscar dados:", e); }
    },

    // Navegação
    navigate: (view, el) => {
        app.currentView = view;
        localStorage.setItem('lastView', view);
        
        // UI Updates
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(el) el.classList.add('active');
        else {
            // Fallback se o elemento não for passado
            const target = document.querySelector(`.nav-item[data-target="${view}"]`);
            if(target) target.classList.add('active');
        }

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(view);
        if(screen) screen.classList.add('active');

        // Títulos
        const titles = {
            'disparo': ['Disparo Rápido', 'Envie campanhas em massa agora'],
            'grupos': ['Grupos de E-mail', 'Organize seus contatos e clientes'],
            'templates': ['Modelos de E-mail', 'Crie designs reutilizáveis'],
            'fluxos': ['Fluxos de Automação', 'Crie sequências temporais'],
            'config': ['Configurações', 'Ajustes de SMTP e Servidor']
        };
        
        if(titles[view]) {
            document.getElementById('pageTitle').innerText = titles[view][0];
            document.getElementById('pageSubtitle').innerText = titles[view][1];
        }

        if(view === 'config') app.loadConfig();
        else app.renderList();
        
        app.closePanel();
    },

    // Renderização da Lista Central
    renderList: () => {
        const container = document.getElementById('contentArea');
        if(!container) return;
        
        let html = '';

        if (app.currentView === 'disparo') {
            html = `
                <div class="card-item" style="cursor:default;">
                    <div class="form-group">
                        <label>Selecione o Grupo</label>
                        <select id="sendGrupo">${app.data.grupos.map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}</select>
                    </div>
                    <div class="form-group">
                        <label>Ou e-mails avulsos</label>
                        <textarea id="sendAvulsos" rows="3" placeholder="email@exemplo.com"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Selecione o Template</label>
                        <select id="sendTemplate">${app.data.templates.map(t=>`<option value="${t.id}">${t.nome}</option>`).join('')}</select>
                    </div>
                    <button class="btn btn-primary" onclick="window.app.startSending()">
                        INICIAR DISPARO
                    </button>
                </div>
            `;
        } 
        else if (app.currentView === 'grupos') {
            if(!app.data.grupos.length) html = '<div class="empty-state">Sem grupos.</div>';
            else html = app.data.grupos.map(g => `
                <div class="card-item" onclick="window.app.editItem(${g.id})">
                    <div class="card-header">
                        <div class="card-meta">
                            <div class="avatar purple-gradient">G</div>
                            <div><div class="card-title">${g.nome}</div><div class="card-preview">${g.emails ? g.emails.length : 0} contatos</div></div>
                        </div>
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
                        <div class="card-meta">
                            <div class="avatar" style="background:#333">T</div>
                            <div><div class="card-title">${t.nome}</div><div class="card-preview">${t.assunto}</div></div>
                        </div>
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
                        <div class="card-meta">
                            <div class="avatar" style="background:#22c55e">A</div>
                            <div><div class="card-title">${f.nome}</div><div class="card-preview">${f.steps.length} passos</div></div>
                        </div>
                        <span class="tag orange">Auto</span>
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;
    },

    // Painel Lateral (Salesforce Style)
    openCreatePanel: () => {
        if(app.currentView === 'disparo' || app.currentView === 'config') return;
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
            panel.classList.remove('open'); // Mobile
        }
    },

    renderForm: () => {
        const container = document.getElementById('formFields');
        const title = document.getElementById('formTitle');
        let fields = '';
        
        document.getElementById('defaultPanelContent').style.display = 'none';
        document.getElementById('dynamicForm').style.display = 'block';
        document.getElementById('actionPanel').classList.add('open');

        if (app.currentView === 'grupos') {
            const item = app.currentItemId ? app.data.grupos.find(x => x.id === app.currentItemId) : { nome: '', emails: [] };
            title.innerText = app.currentItemId ? 'Editar Grupo' : 'Novo Grupo';
            fields = `
                <div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div>
                <div class="form-group"><label>E-mails (um por linha)</label><textarea id="f_emails" rows="10">${item.emails ? item.emails.join('\n') : ''}</textarea></div>
            `;
        }
        else if (app.currentView === 'templates') {
            const item = app.currentItemId ? app.data.templates.find(x => x.id === app.currentItemId) : { nome: '', assunto: '', html: '' };
            title.innerText = app.currentItemId ? 'Editar Template' : 'Novo Template';
            fields = `
                <div class="form-group"><label>Nome Interno</label><input id="f_nome" value="${item.nome}"></div>
                <div class="form-group"><label>Assunto</label><input id="f_assunto" value="${item.assunto}"></div>
                <div class="form-group"><label>HTML</label><textarea id="f_html" rows="15" style="font-family:monospace; font-size:12px;">${item.html}</textarea></div>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-secondary" onclick="window.app.insertTag('<img src=...>')">IMG</button>
                    <button class="btn btn-secondary" onclick="window.app.insertTag('<a href=...>')">LINK</button>
                </div>
            `;
        }
        else if (app.currentView === 'fluxos') {
            const item = app.currentItemId ? app.data.fluxos.find(x => x.id === app.currentItemId) : { nome: '', steps: [] };
            title.innerText = app.currentItemId ? 'Editar Fluxo' : 'Novo Fluxo';
            
            const stepsHtml = (item.steps || []).map((s, i) => `
                <div style="background:#151515; padding:10px; border-radius:8px; margin-bottom:8px; border:1px dashed #333;">
                    <div style="font-size:11px; color:#666; margin-bottom:4px;">PASSO ${i+1}</div>
                    <div style="font-weight:600;">Template ID: ${s.templateId}</div>
                    <div style="font-size:12px;">Espera: ${s.delay}h</div>
                </div>
            `).join('');

            fields = `
                <div class="form-group"><label>Nome da Campanha</label><input id="f_nome" value="${item.nome}"></div>
                <label>Sequência (Modo Leitura)</label>
                ${stepsHtml || '<div style="opacity:0.5; font-size:12px;">Nenhum passo.</div>'}
                <div style="padding:10px; background:rgba(244,137,60,0.1); border:1px solid rgba(244,137,60,0.3); border-radius:8px; font-size:12px; color:#FDBA74; margin-top:10px;">
                    ⚠ Para adicionar passos, delete e recrie o fluxo.
                </div>
                <input type="hidden" id="f_steps_json" value='${JSON.stringify(item.steps || [])}'>
            `;
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

        if (app.currentView === 'grupos') {
            body = {
                id: id,
                nome: document.getElementById('f_nome').value,
                emails: document.getElementById('f_emails').value.split('\n').map(e=>e.trim()).filter(e=>e.includes('@'))
            };
        } else if (app.currentView === 'templates') {
            body = {
                id: id,
                nome: document.getElementById('f_nome').value,
                assunto: document.getElementById('f_assunto').value,
                html: document.getElementById('f_html').value
            };
        } else if (app.currentView === 'fluxos') {
            body = {
                id: id,
                nome: document.getElementById('f_nome').value,
                steps: JSON.parse(document.getElementById('f_steps_json').value)
            };
        }

        await fetch(`/api/${app.currentView}`, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body)
        });

        app.showToast('Salvo com sucesso!', 'success');
        app.fetchData().then(() => app.renderList());
        app.closePanel();
    },

    deleteCurrent: async () => {
        if(!confirm("Tem certeza que deseja excluir?")) return;
        await fetch(`/api/${app.currentView}`, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: app.currentItemId })
        });
        app.showToast('Item excluído.', 'success');
        app.fetchData().then(() => { app.renderList(); app.closePanel(); });
    },

    // Configurações
    loadConfig: async () => {
        document.getElementById('contentArea').innerHTML = `
            <div class="card-item" style="cursor:default">
                <div class="form-group"><label>Host</label><input id="confHost"></div>
                <div class="form-group"><label>Porta</label><input type="number" id="confPort"></div>
                <div class="form-group"><label>User</label><input id="confUser"></div>
                <div class="form-group"><label>Senha</label><input type="password" id="confPass"></div>
                <div class="form-group"><label>Remetente</label><input id="confSender"></div>
                <div class="form-group"><label>SSL</label><select id="confSecure"><option value="false">Não</option><option value="true">Sim</option></select></div>
                <button class="btn btn-primary" onclick="window.app.saveConfig()">Salvar SMTP</button>
            </div>
        `;
        const res = await fetch('/api/settings').then(r=>r.json());
        if(res) {
            document.getElementById('confHost').value = res.smtp_host || '';
            document.getElementById('confPort').value = res.smtp_port || '';
            document.getElementById('confUser').value = res.smtp_user || '';
            document.getElementById('confPass').value = res.smtp_pass || '';
            document.getElementById('confSender').value = res.sender_email || '';
            document.getElementById('confSecure').value = res.smtp_secure ? "true" : "false";
        }
    },

    saveConfig: async () => {
        const data = {
            host: document.getElementById('confHost').value,
            port: document.getElementById('confPort').value,
            user: document.getElementById('confUser').value,
            pass: document.getElementById('confPass').value,
            sender: document.getElementById('confSender').value,
            secure: document.getElementById('confSecure').value === "true"
        };
        await fetch('/api/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
        app.showToast('SMTP Salvo!', 'success');
    },

    // Helpers
    startSending: async () => {
        const gid = document.getElementById('sendGrupo').value;
        const tid = document.getElementById('sendTemplate').value;
        const avulsos = document.getElementById('sendAvulsos').value;
        
        let list = [];
        if(gid) { const g = app.data.grupos.find(x=>x.id==gid); if(g) list = [...g.emails]; }
        if(avulsos) list = [...list, ...avulsos.split('\n').filter(e=>e.includes('@'))];
        list = [...new Set(list)];

        if(!list.length) return app.showToast('Sem e-mails', 'error');
        if(!confirm(`Disparar para ${list.length} pessoas?`)) return;

        const tmpl = app.data.templates.find(x=>x.id==tid);
        const subj = tmpl ? tmpl.assunto : 'Aviso';
        const html = tmpl ? tmpl.html : 'Olá';

        app.showToast('Iniciando envio...', 'success');
        
        for(let i=0; i<list.length; i+=5) {
            const batch = list.slice(i, i+5);
            await Promise.all(batch.map(email => 
                fetch('/api/send', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({email, subject:subj, html})
                })
            ));
            await new Promise(r=>setTimeout(r, 1000));
        }
        app.showToast('Envio concluído!', 'success');
    },

    insertTag: (tag) => { document.getElementById('f_html').value += tag; },
    
    showToast: (msg, type) => {
        const t = document.createElement('div');
        t.className = `toast ${type || ''}`;
        t.innerHTML = `<span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

// Start
document.addEventListener('DOMContentLoaded', app.init);