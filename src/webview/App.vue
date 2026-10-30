<script setup lang="ts">
import { computed } from 'vue';
import { WIDELY_RECENT_DAYS } from '../shared/constants';
import type { Cat } from '../shared/types';
import FeatureSection from './FeatureSection.vue';
import NewsList from './NewsList.vue';
import { data, hasVisible, hiddenCount, loading, mark, marks, newsKey, newsList, refresh, unread, view } from './store';
import type { Type } from './store';

const types: { id: Type; label: string }[] = [
  { id: 'all', label: 'Alle' },
  ...(['CSS', 'HTML', 'JS'] as Cat[]).map((c) => ({ id: c, label: c })),
];

const d = computed(() => data.value!);
const hour = new Date().getHours();
const greeting = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

const stats = computed(() =>
  d.value.features
    ? ` · ${d.value.features.newlyRecent.length} neu in Browsern · ${d.value.features.widelyRecent.length} jetzt widely`
    : '',
);

const readAllNews = () =>
  mark(
    d.value.news.map((n) => newsKey(n.link)).filter((k) => !marks.value[k]?.hidden),
    { read: 1 },
  );
</script>

<template>
  <p v-if="!data" class="loading">Lade …</p>
  <div v-else class="wrap" :data-tab="view.tab">
    <header class="mast">
      <div>
        <h1>{{ greeting }}.</h1>
        <p>{{ today }} · {{ d.news.length }} Meldungen{{ stats }}</p>
      </div>
      <small>
        Stand {{ d.at }}
        <button
          type="button"
          class="refresh"
          :class="{ busy: loading }"
          :disabled="loading"
          title="Jetzt aktualisieren"
          aria-label="Jetzt aktualisieren"
          @click="refresh"
        >
          ↻
        </button>
      </small>
    </header>

    <nav class="bar">
      <div class="tabs" role="tablist">
        <button type="button" role="tab" :aria-selected="view.tab === 'news'" @click="view.tab = 'news'">
          Nachrichten<span v-if="unread.news" class="cnt">{{ unread.news }}</span>
        </button>
        <button type="button" role="tab" :aria-selected="view.tab === 'feat'" @click="view.tab = 'feat'">
          Browser-Features<span v-if="unread.feat" class="cnt">{{ unread.feat }}</span>
        </button>
      </div>
      <div class="tools">
        <button type="button" class="chip" :aria-pressed="view.fav" @click="view.fav = !view.fav">★ Nur Favoriten</button>
        <button type="button" class="chip" :aria-pressed="view.hid" @click="view.hid = !view.hid">
          Ausgeblendete anzeigen <span v-if="hiddenCount">({{ hiddenCount }})</span>
        </button>
      </div>
    </nav>

    <main class="cols">
      <div id="news" class="panel" role="tabpanel">
        <h2 class="ph">
          Nachrichten<span v-if="unread.news" class="cnt">{{ unread.news }}</span>
        </h2>
        <div class="sh">
          <span class="sub">{{ d.news.length }} Meldungen</span>
          <button type="button" class="lk" @click="readAllNews">Alle als gelesen markieren</button>
        </div>
        <NewsList :news="newsList" />
        <p v-if="d.news.length && !hasVisible.news" class="none">
          Nichts anzuzeigen. Prüfe den Favoriten-Filter oder blende ausgeblendete Einträge ein.
        </p>
      </div>

      <div id="feat" class="panel" role="tabpanel">
        <h2 class="ph">
          Browser-Features<span v-if="unread.feat" class="cnt">{{ unread.feat }}</span>
        </h2>
        <p v-if="!d.features" class="empty">Baseline-Daten nicht erreichbar.</p>
        <template v-else>
          <div class="pills">
            <button v-for="t in types" :key="t.id" type="button" class="chip" :aria-pressed="view.type === t.id" @click="view.type = t.id">
              {{ t.label }}
            </button>
          </div>
          <div class="subtabs" role="tablist">
            <button type="button" role="tab" :aria-selected="view.sub === 'newly'" @click="view.sub = 'newly'">
              Neu verfügbar<span v-if="unread.newly" class="cnt">{{ unread.newly }}</span>
            </button>
            <button type="button" role="tab" :aria-selected="view.sub === 'widely'" @click="view.sub = 'widely'">
              Jetzt widely<span v-if="unread.widely" class="cnt">{{ unread.widely }}</span>
            </button>
          </div>
          <FeatureSection
            id="newly"
            title="Neu in allen Browsern"
            :sub="`Baseline „newly“: in allen Kernbrowsern verfügbar, in den letzten ${WIDELY_RECENT_DAYS} Tagen.`"
            :recent="d.features.newlyRecent"
            :older="d.features.newlyOlder"
            :mdn="d.mdn"
          />
          <FeatureSection
            id="widely"
            title="Jetzt überall verfügbar"
            sub="Baseline „widely“: seit 2,5 bis 3,5 Jahren in allen Browsern."
            :recent="d.features.widelyRecent"
            :older="d.features.widelyOlder"
            :mdn="d.mdn"
          />
          <p v-if="!hasVisible.feat" class="none">Nichts anzuzeigen. Prüfe den Favoriten-Filter oder blende ausgeblendete Einträge ein.</p>
        </template>
      </div>
    </main>

    <footer v-if="d.failed.length">Feeds nicht erreichbar: {{ d.failed.join(', ') }}</footer>
  </div>
</template>
