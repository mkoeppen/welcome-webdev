<script setup lang="ts">
import { computed } from 'vue';
import type { NewsItem } from '../shared/types';
import { when } from './format';
import ItemAction from './ItemAction.vue';
import { flags, mark, newsKey, visible } from './store';

const props = defineProps<{ news: NewsItem[] }>();

// Aufmacher: erste Meldung mit Bild unter den ersten sechs
const leadIdx = computed(() =>
  Math.max(
    0,
    props.news.slice(0, 6).findIndex((n) => n.image),
  ),
);
const lead = computed(() => props.news[leadIdx.value]);
const rest = computed(() => props.news.filter((_, i) => i !== leadIdx.value));
const read = (n: NewsItem) => mark([newsKey(n.link)], { read: 1 });
</script>

<template>
  <p v-if="!lead" class="empty">Keine News geladen.</p>
  <template v-else>
    <article v-show="visible(newsKey(lead.link))" class="lead" :class="flags(newsKey(lead.link))">
      <a v-if="lead.image" class="img" :href="lead.link" tabindex="-1" aria-hidden="true" @click="read(lead)">
        <img :src="lead.image" alt="" loading="lazy" />
      </a>
      <div class="meta">
        <b>{{ lead.source }}</b>
        <template v-if="lead.date"> · {{ when(lead.date) }}</template>
        <span class="act">
          <ItemAction act="read" :item-key="newsKey(lead.link)" />
          <ItemAction act="fav" :item-key="newsKey(lead.link)" />
          <ItemAction act="hide" :item-key="newsKey(lead.link)" />
        </span>
      </div>
      <h3>
        <a :href="lead.link" @click="read(lead)">{{ lead.title }}</a>
      </h3>
      <p v-if="lead.desc">{{ lead.desc }}</p>
    </article>

    <article
      v-for="(n, i) in rest"
      v-show="visible(newsKey(n.link))"
      :key="n.link"
      class="story"
      :class="[{ noimg: !n.image }, flags(newsKey(n.link))]"
      :style="{ '--i': Math.min(i + 1, 8) }"
    >
      <a v-if="n.image" class="img" :href="n.link" tabindex="-1" aria-hidden="true" @click="read(n)">
        <img :src="n.image" alt="" loading="lazy" />
      </a>
      <div>
        <div class="meta">
          <b>{{ n.source }}</b>
          <template v-if="n.date"> · {{ when(n.date) }}</template>
          <span class="act">
            <ItemAction act="read" :item-key="newsKey(n.link)" />
            <ItemAction act="fav" :item-key="newsKey(n.link)" />
            <ItemAction act="hide" :item-key="newsKey(n.link)" />
          </span>
        </div>
        <h3>
          <a :href="n.link" @click="read(n)">{{ n.title }}</a>
        </h3>
        <p v-if="n.desc">{{ n.desc }}</p>
      </div>
    </article>
  </template>
</template>
