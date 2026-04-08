import * as materialIcons from '@quasar/extras/material-icons';
import { boot } from 'quasar/wrappers';

type IconMapResult = { icon: string } | void;

const materialIconPrefixPattern = /^(o_|r_|s_|sym_o_|sym_r_|sym_s_)/;
const materialIconNamePattern = /^[a-z0-9_-]+$/;

function toMaterialExportName(iconName: string): string {
  const normalizedName = iconName.replace(materialIconPrefixPattern, '');

  const pascalName = normalizedName
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return `mat${pascalName}`;
}

function resolveMaterialSvgIcon(iconName: string): IconMapResult {
  if (!materialIconNamePattern.test(iconName)) {
    return;
  }

  const exportName = toMaterialExportName(iconName);
  const icon = (materialIcons as Record<string, string | undefined>)[exportName];

  if (typeof icon !== 'string') {
    return;
  }

  return { icon };
}

export default boot(({ app }) => {
  const $q = app.config.globalProperties.$q as {
    iconMapFn: ((iconName: string) => IconMapResult) | null;
  };

  const previousIconMapFn = $q.iconMapFn ?? undefined;

  $q.iconMapFn = (iconName: string) => previousIconMapFn?.(iconName) ?? resolveMaterialSvgIcon(iconName);
});
