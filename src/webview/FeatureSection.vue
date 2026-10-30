<script setup lang="ts">
import { ref } from 'vue';
import type { Feature } from '../shared/types';
import FeatureTable from './FeatureTable.vue';
import { featKey, marks, mark, view } from './store';

const props = defineProps<{
  id: 'newly' | 'widely';
  title: string;
  sub: string;
  recent: Feature[];
  older: Feature[];
  mdn: Record<string, string>;
}>();

const opened = ref(false);

const readAll = () =>
  mark(
    [...props.recent, ...props.older].map((f) => featKey(f.id)).filter((k) => !marks.value[k]?.hidden),
    { read: 1 },
  );
</script>

<template>
  <section v-show="view.sub === id">
    <div class="sh">
      <h2>
        {{ title }} <span>{{ recent.length }}</span>
      </h2>
      <span class="sub">{{ sub }}</span>
      <button type="button" class="lk" @click="readAll">Alle als gelesen markieren</button>
    </div>
    <FeatureTable :rows="recent" :old="false" :mdn="mdn" />
    <!-- Die Älteren sind oft tausend Zeilen: erst beim Aufklappen rendern -->
    <details v-if="older.length" @toggle="opened = ($event.target as HTMLDetailsElement).open">
      <summary>Ältere ({{ older.length }})</summary>
      <FeatureTable v-if="opened" :rows="older" :old="true" :mdn="mdn" />
    </details>
  </section>
</template>
