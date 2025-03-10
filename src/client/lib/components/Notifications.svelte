<script lang="ts" module>
	export interface Notification {
		text: string;
		type: 'error' | 'alert';
		death: number | null;
	}

	export interface NotifConfig {
		text: string;
		type: 'error' | 'alert';
		expiration?: number;
	}

	export interface NotifHandle {
		remove(): void;
		refresh(): void;
	}

	let notifications: Notification[] = $state([]);

	export function createNotification(config: NotifConfig): NotifHandle {
		const remover = () => (notifications = notifications.filter((n) => n !== notification));

		const notification: Notification = {
			text: config.text,
			type: config.type,
			death: config.expiration !== undefined ? window.setTimeout(remover, config.expiration) : null
		};

		notifications.push(notification);

		return {
			remove: () => {
				if (config.expiration !== undefined) clearTimeout(notification.death);
				remover();
			},
			refresh:
				config.expiration !== undefined
					? () => {
							clearTimeout(notification.death);
							notification.death = window.setTimeout(remover, config.expiration);
						}
					: () => {}
		};
	}
</script>

<div class="notif-col">
	{#each notifications as notification}
		<div class="notification {notification.type}" onclick={() => (notifications = notifications.filter((n) => n !== notification))}>
			{#if notification.type === 'alert'}
				<i class="fa-solid fa-circle-info"></i>
			{:else}
				<i class="fa-solid fa-triangle-exclamation"></i>
			{/if}
			<p>{notification.text}</p>
		</div>
	{/each}
</div>

<style lang="scss">
	.notif-col {
		position: absolute;
		top: 1em;
		right: 2em;
		display: flex;
		flex-direction: column;
		gap: 0.5em;

		.notification {
			border: 1px solid black;
			border-left: 8px solid;
			border-radius: 4px;
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 1em;
			cursor: pointer;
			padding: 0.5em 1em;
			box-shadow: 4px 4px 4px rgba(0, 0, 0, 0.5);

			&.alert {
				border-left-color: var(--primary-background);

				i {
					color: var(--primary-background);
				}
			}

			&.error {
				border-left-color: var(--error);

				i {
					color: var(--error);
				}
			}

			p {
				margin: 0;
				color: black;
			}
		}
	}
</style>
