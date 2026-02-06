import { SVGProps } from 'react';

export function AddIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License */}
      <path fill="currentColor" d="M11 11V2h2v9h9v2h-9v9h-2v-9H2v-2z" />
    </svg>
  );
}
