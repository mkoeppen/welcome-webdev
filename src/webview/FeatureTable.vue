<script setup lang="ts">
import type { Feature } from '../shared/types';
import { clip, fdate } from './format';
import ItemAction from './ItemAction.vue';
import { featKey, flags, mark, visible } from './store';

defineProps<{ rows: Feature[]; old: boolean; mdn: Record<string, string> }>();

const href = (f: Feature, mdn: Record<string, string>) =>
  mdn[f.id] ?? `https://developer.mozilla.org/search?q=${encodeURIComponent(f.name)}`;
const read = (f: Feature) => mark([featKey(f.id)], { read: 1 });
</script>

<template>
  <table class="ft">
    <thead>
      <tr>
        <th></th>
        <th></th>
        <th>Feature</th>
        <th>Typ</th>
        <th>Seit</th>
        <th>Links</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="f in rows" v-show="visible(featKey(f.id), f.cat)" :key="f.id" :class="flags(featKey(f.id), old)">
        <td class="a"><ItemAction act="read" :item-key="featKey(f.id)" :old="old" /></td>
        <td class="a"><ItemAction act="fav" :item-key="featKey(f.id)" /></td>
        <td class="n">
          <strong>{{ f.name }}</strong>
          <p v-if="!old && f.desc">{{ clip(f.desc, 200) }}</p>
        </td>
        <td>
          <span class="b" :class="f.cat">{{ f.cat }}</span>
        </td>
        <td class="d">{{ fdate(f.low) }}</td>
        <td class="l">
          <a :href="href(f, mdn)" @click="read(f)">{{ mdn[f.id] ? 'MDN' : 'MDN-Suche' }}</a>
          <a :href="`https://webstatus.dev/features/${f.id}`" @click="read(f)">Status</a>
        </td>
        <td class="a"><ItemAction act="hide" :item-key="featKey(f.id)" /></td>
      </tr>
    </tbody>
  </table>
</template>
