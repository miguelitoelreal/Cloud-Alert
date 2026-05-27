declare module "react-simple-maps" {
  import * as React from "react";

  interface GeographyType {
    rsmKey: string;
    type: string;
    properties: Record<string, unknown>;
    geometry: Record<string, unknown>;
  }

  interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      scale?: number;
      center?: [number, number];
      rotate?: [number, number, number];
    };
    width?: number;
    height?: number;
    viewBox?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }

  interface ZoomableGroupProps {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    translateExtent?: [[number, number], [number, number]];
    onMoveStart?: (event: unknown, position: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (event: unknown, position: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (event: unknown, position: { coordinates: [number, number]; zoom: number }) => void;
    children?: React.ReactNode;
  }

  interface GeographiesProps {
    geography: string | Record<string, unknown> | Array<unknown>;
    children: (props: { geographies: GeographyType[] }) => React.ReactNode;
  }

  interface GeographyProps {
    geography?: GeographyType;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
  }

  interface MarkerProps {
    coordinates: [number, number];
    children?: React.ReactNode;
  }

  export const ComposableMap: React.FC<ComposableMapProps>;
  export const ZoomableGroup: React.FC<ZoomableGroupProps>;
  export const Geographies: React.FC<GeographiesProps>;
  export const Geography: React.FC<GeographyProps>;
  export const Marker: React.FC<MarkerProps>;
}
