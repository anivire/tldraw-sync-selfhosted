import { SVGProps } from 'react';

export function ConnectionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}
      <path fill="currentColor" d="M5 20v-6h3v6zm6 0V9h3v11zm6 0V4h3v16z" />
    </svg>
  );
}
