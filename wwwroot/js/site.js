// Please see documentation at https://learn.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

document.addEventListener('DOMContentLoaded', () => {
	const bellButton = document.getElementById('notificationBellBtn');
	const panel = document.getElementById('notificationPanel');
	const list = document.getElementById('notificationList');
	const badge = document.getElementById('notificationCount');
	const panelCount = document.getElementById('notificationPanelCount');
	const wrap = document.getElementById('notificationWrap');

	if (!bellButton || !panel || !list || !badge || !panelCount || !wrap) {
		return;
	}

	let isOpen = false;
	let isLoaded = false;

	const severityLabel = (value) => {
		if (value === 1 || value === '1') return { text: 'Crítica', className: 'notification-severity-critical' };
		if (value === 2 || value === '2') return { text: 'Alta', className: 'notification-severity-high' };
		return { text: 'Media', className: 'notification-severity-medium' };
	};

	const escapeHtml = (value) => {
		return String(value ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	};

	const formatDate = (value) => {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) {
			return 'Fecha no disponible';
		}

		return date.toLocaleString('es-ES', {
			dateStyle: 'short',
			timeStyle: 'short'
		});
	};

	const truncate = (value, maxLength) => {
		if (!value) return 'Sin descripción disponible.';
		return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
	};

	const togglePanel = (forceOpen) => {
		isOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
		panel.classList.toggle('d-none', !isOpen);
		bellButton.setAttribute('aria-expanded', String(isOpen));

		if (isOpen && !isLoaded) {
			loadNotifications();
		}
	};

	const renderEmpty = (message) => {
		list.innerHTML = `<div class="notification-empty">${escapeHtml(message)}</div>`;
		badge.classList.add('d-none');
		badge.textContent = '0';
		panelCount.textContent = '0 incidentes';
	};

	const renderNotifications = (groups) => {
		const total = groups.reduce((sum, group) => sum + (group.total || 0), 0);

		badge.textContent = String(total);
		badge.classList.toggle('d-none', total === 0);
		panelCount.textContent = `${total} incidente${total === 1 ? '' : 's'}`;

		if (!groups.length || total === 0) {
			renderEmpty('No hay incidentes activos en este momento.');
			return;
		}

		list.innerHTML = groups.map((group) => {
			const items = (group.incidentes || []).map((incident) => {
				const severity = severityLabel(incident.severidad);
				const description = truncate(incident.descripcion, 140);
				const detailUrl = incident.urlDetalle || '#';

				return `
					  <article class="notification-item" role="button" tabindex="0" data-url="${escapeHtml(detailUrl)}">
						<div class="notification-item-top">
							<div class="notification-item-title">${escapeHtml(incident.titulo || 'Incidente sin título')}</div>
							<span class="notification-severity ${severity.className}">${escapeHtml(severity.text)}</span>
						</div>
						<div class="notification-item-desc">${escapeHtml(description)}</div>
						<div class="notification-item-footer">
							<span>${escapeHtml(formatDate(incident.fecha))}</span>
							<span>${escapeHtml(group.proveedor || 'Proveedor desconocido')}</span>
						</div>
					</article>
				`;
			}).join('');

			return `
				<section class="notification-group">
					<div class="notification-group-header">
						<strong>${escapeHtml(group.proveedor || 'Proveedor')}</strong>
						<span class="notification-group-meta">${escapeHtml(`${group.total || 0} activo${(group.total || 0) === 1 ? '' : 's'}`)}</span>
					</div>
					${items}
				</section>
			`;
		}).join('');

		list.querySelectorAll('.notification-item').forEach((item) => {
			const openDetail = () => {
				const url = item.getAttribute('data-url');
				if (url && url !== '#') {
					window.open(url, '_blank', 'noopener,noreferrer');
				}
			};

			item.addEventListener('click', openDetail);
			item.addEventListener('keydown', (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openDetail();
				}
			});
		});
	};

	const loadNotifications = async () => {
		try {
			const response = await fetch('/api/incidentes/activos', { headers: { Accept: 'application/json' } });
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const groups = await response.json();
			renderNotifications(Array.isArray(groups) ? groups : []);
			isLoaded = true;
		} catch (error) {
			console.error('No se pudieron cargar las notificaciones', error);
			renderEmpty('No se pudieron cargar las notificaciones. Intenta de nuevo.');
		}
	};

	bellButton.addEventListener('click', (event) => {
		event.stopPropagation();
		togglePanel();
	});

	panel.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	document.addEventListener('click', (event) => {
		if (isOpen && !wrap.contains(event.target)) {
			togglePanel(false);
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			togglePanel(false);
		}
	});
});
