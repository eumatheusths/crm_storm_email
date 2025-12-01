// src/scripts/app.js

const app = {
    currentView: 'disparo',
    data: { grupos: [], templates: [], fluxos: [], settings: [] },
    currentItemId: null,
    tempSteps: [], // Passos temporários da edição

    apiMap: {
        'grupos': 'groups',
        'templates': 'templates',
        'fluxos': 'flows',
        'config': 'settings',
        'disparo': 'send'
    },

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
            document.getElementById('pageTitle').innerText = titles[view][0];
            document.getElementById('pageSubtitle').innerText = titles[view][1];
        }
        app.renderList();
        app.closePanel();
        if (view === 'config') app.renderForm(); 
    },

    renderList: () => {
        const container = document.getElementById('contentArea');
        if(!container) return;
        let html = '';

        if (app.currentView === 'disparo') {
            const smtps = app.data.settings.length ? app.data.settings : [];
            let smtpOptions = smtps.length ? smtps.map(s => `<option value="${s.id}">${s.name} (${s.smtp_user})</option>`).join('') : `<option value="">⚠️ Configure um SMTP</option>`;
            html = `
                <div class="card-item" style="cursor:default;">
                    <div class="form-group" style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:20px; margin-bottom:20px;">
                        <label style="color:#a78bfa;">🚀 Servidor de Envio</label>
                        <select id="sendSmtp" style="border-color:#7c3aed;">${smtpOptions}</select>
                    </div>
                    <div class="form-group"><label>Grupo de Destino</label><select id="sendGrupo"><option value="">-- Selecione --</option>${app.data.grupos.map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Ou e-mails avulsos</label><textarea id="sendAvulsos" rows="3" placeholder="email@exemplo.com"></textarea></div>
                    <div class="form-group"><label>Template</label><select id="sendTemplate">${app.data.templates.map(t=>`<option value="${t.id}">${t.nome}</option>`).join('')}</select></div>
                    <button class="btn btn-primary" id="btnStart" onclick="window.app.startSending()">INICIAR DISPARO</button>
                </div>
            `;
        } 
        else if (app.currentView === 'fluxos') {
            const processBtn = `<div style="margin-bottom:20px; display:flex; justify-content:flex-end;"><button class="btn btn-primary" style="width:auto; background:var(--accent-orange); border:none;" onclick="window.app.processQueue()">⚙️ Processar Fila Agora</button></div>`;
            const list = app.data.fluxos.map(f => {
                const sent = parseInt(f.stats?.sent || 0);
                const opened = parseInt(f.stats?.opened || 0);
                const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                return `
                <div class="card-item" style="${f.active ? 'border-left: 4px solid #10b981;' : ''}">
                    <div class="card-header">
                        <div class="card-meta"><div class="avatar" style="background:#22c55e">A</div><div><div class="card-title">${f.nome}</div><div class="card-preview">${f.steps.length} passos</div></div></div>
                        <span class="tag orange">${f.active ? 'ATIVO' : 'PARADO'}</span>
                    </div>
                    <div style="margin:15px 0; background:rgba(0,0,0,0.3); padding:10px; border-radius:8px;">
                        <div style="font-size:11px; color:#aaa; display:flex; justify-content:space-between; margin-bottom:5px;"><span>Taxa de Abertura: ${openRate}%</span><span>${opened}/${sent}</span></div>
                        <div style="height:4px; background:#333; border-radius:2px; overflow:hidden;"><div style="height:100%; width:${openRate}%; background:#10b981;"></div></div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button class="btn btn-secondary" style="font-size:11px; padding:8px;" onclick="window.app.editItem(${f.id})">EDITAR</button>
                        <button class="btn btn-secondary" style="font-size:11px; padding:8px; border-color:#7c3aed; color:#a78bfa;" onclick="window.app.iniciarFluxo(${f.id})">▶ INICIAR</button>
                        <button class="btn btn-secondary" style="font-size:11px; padding:8px; border-color:#ef4444; color:#ef4444;" onclick="window.app.deleteCurrent(${f.id})">🗑</button>
                    </div>
                </div>`
            }).join('');
            html = processBtn + (list || '<div class="empty-state">Sem fluxos.</div>');
        }
        else if (app.currentView === 'grupos') {
            html = app.data.grupos.map(g => `<div class="card-item" onclick="window.app.editItem(${g.id})"><div class="card-header"><div class="card-meta"><div class="avatar purple-gradient">G</div><div><div class="card-title">${g.nome}</div><div class="card-preview">${g.emails ? g.emails.length : 0} contatos</div></div></div><span class="tag orange">Lista</span></div></div>`).join('');
        }
        else if (app.currentView === 'templates') {
            html = app.data.templates.map(t => `<div class="card-item" onclick="window.app.editItem(${t.id})"><div class="card-header"><div class="card-meta"><div class="avatar" style="background:#333">T</div><div><div class="card-title">${t.nome}</div><div class="card-preview">${t.assunto}</div></div></div><span class="tag purple">HTML</span></div></div>`).join('');
        }
        else if (app.currentView === 'config') {
            html = app.data.settings.map(s => `<div class="card-item" onclick="window.app.editItem(${s.id})"><div class="card-header"><div class="card-meta"><div class="avatar" style="background:#0ea5e9">S</div><div><div class="card-title">${s.name}</div><div class="card-preview">${s.smtp_host}</div></div></div></div></div>`).join('');
        }
        container.innerHTML = html;
    },

    openCreatePanel: () => { if(app.currentView === 'disparo') return; app.currentItemId = null; app.renderForm(); },
    editItem: (id) => { app.currentItemId = id; app.renderForm(); },
    closePanel: () => {
        const panel = document.getElementById('actionPanel');
        if(panel) { document.getElementById('defaultPanelContent').style.display = 'block'; document.getElementById('dynamicForm').style.display = 'none'; panel.classList.remove('open'); }
    },

    renderForm: () => {
        const container = document.getElementById('formFields');
        const title = document.getElementById('formTitle');
        let fields = '';
        document.getElementById('defaultPanelContent').style.display = 'none';
        document.getElementById('dynamicForm').style.display = 'block';
        document.getElementById('actionPanel').classList.add('open');

        // --- EDITOR DE FLUXOS (COM MINUTOS) ---
        if (app.currentView === 'fluxos') {
            const item = app.currentItemId ? app.data.fluxos.find(x => x.id === app.currentItemId) : { nome: '', steps: [] };
            title.innerText = app.currentItemId ? 'Editar Automação' : 'Nova Automação';
            app.tempSteps = item.steps ? JSON.parse(JSON.stringify(item.steps)) : [];

            fields = `
                <div class="form-group"><label>Nome da Campanha</label><input id="f_nome" value="${item.nome}" placeholder="Ex: Onboarding"></div>
                <div style="border-top:1px solid rgba(255,255,255,0.1); margin:20px 0; padding-top:10px;">
                    <label style="color:#a78bfa; margin-bottom:15px;">LINHA DO TEMPO</label>
                    <div id="stepsList"></div>
                </div>
                <button class="btn btn-secondary" style="border-style:dashed; margin-bottom:20px;" onclick="window.app.addStep()">+ Adicionar E-mail</button>
            `;
            setTimeout(() => app.renderStepsList(), 50);
        }
        // --- OUTROS ---
        else if (app.currentView === 'config') {
            const item = app.currentItemId ? app.data.settings.find(x => x.id === app.currentItemId) : { name:'', smtp_host:'', smtp_port:'587', smtp_user:'', smtp_pass:'', sender_email:'', smtp_secure:false };
            title.innerText = 'Editar SMTP';
            fields = `<div class="form-group"><label>Nome</label><input id="c_name" value="${item.name||''}"></div><div class="form-group"><label>Host</label><input id="c_host" value="${item.smtp_host||''}"></div><div class="form-group"><label>Porta</label><input type="number" id="c_port" value="${item.smtp_port||587}"></div><div class="form-group"><label>User</label><input id="c_user" value="${item.smtp_user||''}"></div><div class="form-group"><label>Senha</label><input type="text" id="c_pass" value="${item.smtp_pass||''}"></div><div class="form-group"><label>Remetente</label><input id="c_sender" value="${item.sender_email||''}"></div><div class="form-group"><label>SSL</label><select id="c_secure"><option value="false" ${!item.smtp_secure?'selected':''}>Não</option><option value="true" ${item.smtp_secure?'selected':''}>Sim</option></select></div>`;
        }
        else if (app.currentView === 'grupos') {
            const item = app.currentItemId ? app.data.grupos.find(x => x.id === app.currentItemId) : { nome: '', emails: [] };
            title.innerText = 'Grupo'; fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><div class="form-group"><label>E-mails</label><textarea id="f_emails" rows="10">${item.emails ? item.emails.join('\n') : ''}</textarea></div>`;
        }
        else if (app.currentView === 'templates') {
            const item = app.currentItemId ? app.data.templates.find(x => x.id === app.currentItemId) : { nome: '', assunto: '', html: '' };
            title.innerText = 'Template'; fields = `<div class="form-group"><label>Nome</label><input id="f_nome" value="${item.nome}"></div><div class="form-group"><label>Assunto</label><input id="f_assunto" value="${item.assunto}"></div><div class="form-group"><label>HTML</label><textarea id="f_html" rows="15" style="font-family:monospace;">${item.html}</textarea></div>`;
        }

        if(app.currentItemId) fields += `<div style="margin-top:40px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.1);"><button class="btn btn-delete" onclick="window.app.deleteCurrent()">Excluir</button></div>`;
        container.innerHTML = fields;
    },

    // --- FUNÇÕES VISUAIS DO EDITOR DE FLUXO ---
    renderStepsList: () => {
        const listDiv = document.getElementById('stepsList');
        if(!listDiv) return;
        const html = app.tempSteps.map((step, index) => {
            const templateOptions = `<option value="">Selecione...</option>` + app.data.templates.map(t => `<option value="${t.id}" ${t.id == step.templateId ? 'selected' : ''}>${t.nome}</option>`).join('');
            
            // SELETOR DE UNIDADE (MINUTOS/HORAS)
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

    addStep: () => { app.tempSteps.push({ templateId: "", delay: 5, unit: 'minutes' }); app.renderStepsList(); },
    removeStep: (i) => { app.tempSteps.splice(i, 1); app.renderStepsList(); },
    updateStep: (i, f, v) => { app.tempSteps[i][f] = v; },

    // --- SALVAR E DELETAR ---
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
            body = { id, name: document.getElementById('c_name').value, host: document.getElementById('c_host').value, port: document.getElementById('c_port').value, user: document.getElementById('c_user').value, pass: document.getElementById('c_pass').value, sender: document.getElementById('c_sender').value, secure: document.getElementById('c_secure').value === "true" };
        }
        else if (app.currentView === 'grupos') { body = { id, nome: document.getElementById('f_nome').value, emails: document.getElementById('f_emails').value.split('\n').map(e=>e.trim()).filter(e=>e.includes('@')) }; } 
        else if (app.currentView === 'templates') { body = { id, nome: document.getElementById('f_nome').value, assunto: document.getElementById('f_assunto').value, html: document.getElementById('f_html').value }; }

        const endpoint = app.apiMap[app.currentView];
        try {
            const res = await fetch(`/api/${endpoint}`, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
            if(res.ok) { app.showToast('Salvo!', 'success'); app.fetchData().then(() => app.renderList()); app.closePanel(); } 
            else app.showToast('Erro ao salvar.', 'error');
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

    // --- EXECUÇÃO DO FLUXO ---
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
        if(!smtpId) return app.showToast('Selecione SMTP!', 'error');
        let list = []; if(gid){const g=app.data.grupos.find(x=>x.id==gid); if(g) list=[...g.emails];} if(avulsos) list=[...list, ...avulsos.split('\n').filter(e=>e.includes('@'))]; list=[...new Set(list)];
        if(!list.length) return app.showToast('Sem e-mails', 'error');
        if(!confirm(`Enviar para ${list.length}?`)) return;
        const tmpl = app.data.templates.find(x=>x.id==tid);
        const subj = tmpl ? tmpl.assunto : 'Aviso'; const html = tmpl ? tmpl.html : 'Olá';
        
        app.showToast('Enviando...', 'success');
        const btn = document.getElementById('btnStart'); btn.disabled=true; btn.innerText = "ENVIANDO...";
        let sc=0, ec=0;
        for(let i=0; i<list.length; i+=2) {
            await Promise.all(list.slice(i,i+2).map(async (email) => {
                try {
                    const res = await fetch('/api/send', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email, subject:subj, html, smtpId})});
                    if(res.ok) sc++; else ec++;
                } catch(e) { ec++; }
            }));
            await new Promise(r=>setTimeout(r,1000));
        }
        btn.disabled=false; btn.innerText="INICIAR DISPARO";
        app.showToast(`Fim: ${sc} ok, ${ec} erros.`, 'success');
    },

    showToast: (msg, type) => {
        const t = document.createElement('div'); t.className = `toast ${type||''}`; t.innerHTML = `<span>${msg}</span>`;
        document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3000);
    }
};

document.addEventListener('DOMContentLoaded', app.init);