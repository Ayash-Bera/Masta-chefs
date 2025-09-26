declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  export type LucideIcon = ComponentType<LucideProps>;
  
  export const Shield: LucideIcon;
  export const Home: LucideIcon;
  export const ArrowLeftRight: LucideIcon;
  export const BarChart3: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const User: LucideIcon;
  export const ChevronDownIcon: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const CheckIcon: LucideIcon;
  export const CircleIcon: LucideIcon;
  export const XIcon: LucideIcon;
  export const SearchIcon: LucideIcon;
  export const MinusIcon: LucideIcon;
  export const GripVerticalIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
  export const PanelLeftIcon: LucideIcon;
  export const X: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ChevronRightIcon: LucideIcon;
}
