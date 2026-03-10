<template>
  <article class="media-widget">
    <header class="widget-header">
      <div class="widget-title-group">
        <Icon :icon="icon" class="widget-icon" :class="accentClass" />
        <div>
          <h3 class="widget-title">{{ title }}</h3>
          <span class="widget-status" :class="statusClass">{{ statusText }}</span>
          <span v-if="meta" class="widget-meta">{{ meta }}</span>
        </div>
      </div>
      <a
        v-if="href"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        class="widget-link"
        :aria-label="externalLabel"
      >
        <Icon icon="mdi:open-in-new" />
      </a>
    </header>

    <slot name="stats" />
    <slot />
  </article>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";

defineProps<{
  title: string;
  icon: string;
  statusClass: string;
  statusText: string;
  meta?: string;
  href?: string;
  externalLabel: string;
  accentClass?: string;
}>();
</script>

<style scoped>
.media-widget {
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(20, 25, 32, 0.8);
  padding: 0.75rem;
  min-height: var(--media-widget-min-height);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: border-color 0.2s ease;
}

.media-widget:hover {
  border-color: rgba(255, 255, 255, 0.1);
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.widget-title-group {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.widget-icon {
  font-size: 20px;
  margin-top: 0.1rem;
}

.widget-title {
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.82rem;
}

.widget-status {
  display: inline-flex;
  align-items: center;
  text-transform: capitalize;
  letter-spacing: 0.04em;
  font-size: 0.62rem;
  margin-top: 0.2rem;
  border: 1px solid;
  border-radius: 999px;
  padding: 0.08rem 0.38rem;
}

.widget-meta {
  display: block;
  margin-top: 0.22rem;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.62rem;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.widget-status.online {
  color: #8bd5a8;
  border-color: rgba(139, 213, 168, 0.35);
  background: rgba(139, 213, 168, 0.08);
}

.widget-status.offline,
.widget-status.timeout,
.widget-status.auth_error {
  color: #f2b4b4;
  border-color: rgba(242, 180, 180, 0.35);
  background: rgba(242, 180, 180, 0.08);
}

.widget-status.degraded {
  color: #f2cf8d;
  border-color: rgba(242, 207, 141, 0.35);
  background: rgba(242, 207, 141, 0.08);
}

.widget-status.checking {
  color: #9eb1c5;
  border-color: rgba(158, 177, 197, 0.35);
  background: rgba(158, 177, 197, 0.08);
}

.widget-status.unknown,
.widget-status.disabled {
  color: rgba(255, 255, 255, 0.45);
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
}

.widget-link {
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.widget-link:hover {
  color: #7fa1c3;
  border-color: rgba(127, 161, 195, 0.3);
  background: rgba(127, 161, 195, 0.1);
}

.widget-link:focus-visible {
  outline: 2px solid rgba(127, 161, 195, 0.5);
  outline-offset: 2px;
}
</style>
