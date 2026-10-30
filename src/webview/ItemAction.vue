<script setup lang="ts">
import { computed } from 'vue';
import { isRead, marks, mark } from './store';

const props = defineProps<{ act: 'read' | 'fav' | 'hide'; itemKey: string; old?: boolean }>();

const m = computed(() => marks.value[props.itemKey] ?? {});
const title = computed(() => {
  if (props.act === 'read') return isRead(props.itemKey, props.old) ? 'Als ungelesen markieren' : 'Als gelesen markieren';
  if (props.act === 'fav') return m.value.fav ? 'Favorit entfernen' : 'Als Favorit markieren';
  return m.value.hidden ? 'Wieder einblenden' : 'Ausblenden';
});

function toggle() {
  if (props.act === 'read') mark([props.itemKey], { read: isRead(props.itemKey, props.old) ? 0 : 1 });
  else if (props.act === 'fav') mark([props.itemKey], { fav: m.value.fav ? 0 : 1 });
  else mark([props.itemKey], { hidden: m.value.hidden ? 0 : 1 });
}
</script>

<template>
  <button
    type="button"
    :data-act="act"
    :title="title"
    :aria-label="title"
    :aria-pressed="act === 'fav' ? !!m.fav : undefined"
    @click="toggle"
  ></button>
</template>
