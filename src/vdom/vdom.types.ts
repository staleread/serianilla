import { EventHandler, VdomEventType } from '../dom/events/event.types';

export type VdomNodeType = 'Root' | 'Text' | 'Tag' | 'List' | 'Blank';

export type VdomNode = {
  type: VdomNodeType;
  text?: string;
  key?: any;
  tag?: string;
  attrs?: TagAttr[];
  eventsMap?: Map<VdomEventType, EventHandler>;
  children?: VdomNode[];
};

export type TagAttr = { id: string; value: string };
export type AnyObject = { [key: string]: any };

export type Injection = {
  contextKey: string;
  value: any;
};

export type ComponentFunc = (props?: AnyObject) => ComponentResult;

export type ComponentResult = {
  imports?: ComponentFunc[];
  template: string;
  attach?: AnyObject;
};

export type VdomUnwrapperContext = {
  componentId: string;
  func: ComponentFunc;
  props: AnyObject;
  injections: Injection[];
  unwrapChildren?: (dest: VdomNode[]) => boolean;
};

export type ComponentUnwrapperContext = {
  importsMap: Map<string, ComponentFunc>;
  attachMap: Map<string, unknown>;
  unwrapChildren?: (dest: VdomNode[]) => boolean;
};
