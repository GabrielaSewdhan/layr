import {
  Component,
  isComponent,
  serialize,
  deserialize,
  createComponentMap
} from '@liaison/component';
import {possiblyAsync} from 'possibly-async';
import ow from 'ow';
import debugModule from 'debug';

const ComponentClass = Component();

const debug = debugModule('liaison:component-client');

// To display the debug log, set this environment:
// DEBUG=liaison:component-client DEBUG_DEPTH=10

export class ComponentClient {
  constructor(componentServer, options = {}) {
    ow(componentServer, 'componentServer', ow.object);
    ow(options, 'options', ow.object.exactShape({version: ow.optional.number.integer}));

    if (typeof componentServer.receiveQuery !== 'function') {
      throw new Error(
        'ComponentClient constructor expects a ComponentServer instance to be passed as the first parameter'
      );
    }

    const {version} = options;

    this._componentServer = componentServer;
    this._version = version;
  }

  getComponent(name, options = {}) {
    ow(name, 'name', ow.string.nonEmpty);
    ow(options, 'options', ow.object.exactShape({throwIfMissing: ow.optional.boolean}));

    const {throwIfMissing = true} = options;

    const componentMap = this._getComponentMap();
    const Component = componentMap[name];

    if (Component === undefined) {
      if (throwIfMissing) {
        throw new Error(`The component '${name}' is missing in the component client`);
      }
      return undefined;
    }

    return Component;
  }

  getComponents() {
    if (this._components === undefined) {
      this._components = this._createComponents();
    }

    return this._components;
  }

  _getComponentMap() {
    if (this._componentMap === undefined) {
      const components = this.getComponents();
      this._componentMap = createComponentMap(components);
    }

    return this._componentMap;
  }

  sendQuery(query) {
    ow(query, 'query', ow.object);

    const componentServer = this._componentServer;
    const version = this._version;

    return componentServer.receiveQuery(query, {version});
  }

  _createComponents() {
    const {components: introspectedComponents} = this._introspectRemoteComponents();

    return introspectedComponents.map(introspectedComponent =>
      this._createComponent(introspectedComponent)
    );
  }

  _createComponent(introspectedComponent) {
    const Component = class Component extends ComponentClass {};

    Component.setName(introspectedComponent.name);
    this._setComponentProperties(Component, introspectedComponent.properties);
    this._setComponentProperties(Component.prototype, introspectedComponent.prototype?.properties);

    return Component;
  }

  _setComponentProperties(component, introspectedProperties) {
    if (introspectedProperties === undefined) {
      return;
    }

    for (const introspectedProperty of introspectedProperties) {
      this._setComponentProperty(component, introspectedProperty);
    }
  }

  _setComponentProperty(component, introspectedProperty) {
    const {name, exposure} = introspectedProperty;

    const property = component.setProperty(name);

    property.setExposure(exposure);

    if (exposure.call) {
      Object.defineProperty(component, name, {
        value: this._createComponentMethod(name),
        writable: true,
        enumerable: false,
        configurable: true
      });
    }
  }

  _createComponentMethod(name) {
    const componentClient = this;

    return function(...args) {
      let query = {
        '<=': this,
        [`${name}=>result`]: {
          '()': args
        },
        '=>self': true
      };

      // TODO: if 'this' is in a layer, provide layer's components
      // through the 'componentProvider' serialize()/deserialize() parameter
      const isComponentClass = !isComponent(this);
      const LocalComponent = isComponentClass ? this : this.constructor;
      const knownComponents = [LocalComponent];

      const attributeFilter = function(attribute) {
        // Exclude properties that cannot be set in the remote components

        const isComponentClass = !isComponent(this);
        const LocalComponent = isComponentClass ? this : this.constructor;
        const RemoteComponent = componentClient.getComponent(LocalComponent.getName());
        const remoteComponent = isComponentClass ? RemoteComponent : RemoteComponent.prototype;

        const remoteAttribute = remoteComponent.getAttribute(attribute.getName(), {
          throwIfMissing: false
        });

        if (remoteAttribute !== undefined) {
          return remoteAttribute.operationIsAllowed('set');
        }

        return false;
      };

      query = serialize(query, {knownComponents, attributeFilter, target: 'parent'});

      return possiblyAsync(componentClient.sendQuery(query), {
        then: ({result}) => deserialize(result, {knownComponents, source: 'parent'})
      });
    };
  }

  _introspectRemoteComponents() {
    debug(`Introspecting the remote components`);

    const introspection = this.sendQuery({'introspect=>': {'()': []}});

    debug(`Remote components introspected`);

    return introspection;
  }
}