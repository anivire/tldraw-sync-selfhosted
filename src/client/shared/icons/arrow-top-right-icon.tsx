import { SVGProps } from 'react';

export function ArrowTopRigthIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Remix Icon by Remix Design - https://github.com/Remix-Design/RemixIcon/blob/master/License */}
      <path
        fill="currentColor"
        d="m16.004 9.414l-8.607 8.607l-1.414-1.414L14.59 8H7.003V6h11v11h-2z"
      />
    </svg>
  );
}
