/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/cart`; params?: Router.UnknownInputParams; } | { pathname: `/checkout`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/menu`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/item/[id]`, params: Router.UnknownInputParams & { id: string | number; } } | { pathname: `/order-confirmation/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/cart`; params?: Router.UnknownOutputParams; } | { pathname: `/checkout`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/menu`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/item/[id]`, params: Router.UnknownOutputParams & { id: string; } } | { pathname: `/order-confirmation/[id]`, params: Router.UnknownOutputParams & { id: string; } };
      href: Router.RelativePathString | Router.ExternalPathString | `/cart${`?${string}` | `#${string}` | ''}` | `/checkout${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/menu${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/cart`; params?: Router.UnknownInputParams; } | { pathname: `/checkout`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/menu`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | `/item/${Router.SingleRoutePart<T>}` | `/order-confirmation/${Router.SingleRoutePart<T>}` | { pathname: `/item/[id]`, params: Router.UnknownInputParams & { id: string | number; } } | { pathname: `/order-confirmation/[id]`, params: Router.UnknownInputParams & { id: string | number; } };
    }
  }
}
