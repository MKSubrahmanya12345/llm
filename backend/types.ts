// Types definition for Velxio Project Generator

export interface ComponentInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  properties?: Record<string, any>;
}

export interface ConnectionSchema {
  from: string; // Format: "instanceId:pinName"
  to: string;   // Format: "instanceId:pinName"
  color?: string;
}


export interface VelxioProject {
  projectMetadata: {
    name: string;
  };
  components: ComponentInstance[];
  connections: ConnectionSchema[];
  firmware: {
    code: string;
  };
  libraries?: string[];
}
