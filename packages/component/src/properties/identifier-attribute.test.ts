import {Component} from '../component';
import {IdentifierAttribute, isIdentifierAttributeInstance} from './identifier-attribute';
import {isStringValueTypeInstance, isNumberValueTypeInstance} from './value-types';

describe('IdentifierAttribute', () => {
  test('Creation', async () => {
    class Movie extends Component {}

    let idAttribute = new IdentifierAttribute('id', Movie.prototype);

    expect(isIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isStringValueTypeInstance(idAttribute.getValueType())).toBe(true);

    idAttribute = new IdentifierAttribute('id', Movie.prototype, {valueType: 'number'});

    expect(isIdentifierAttributeInstance(idAttribute)).toBe(true);
    expect(idAttribute.getName()).toBe('id');
    expect(idAttribute.getParent()).toBe(Movie.prototype);
    expect(isNumberValueTypeInstance(idAttribute.getValueType())).toBe(true);

    expect(() => new IdentifierAttribute('id', Movie.prototype, {valueType: 'boolean'})).toThrow(
      "The type of an identifier attribute must be 'string' or 'number' (component: 'Movie', attribute: 'id', specified type: 'boolean')"
    );

    expect(() => new IdentifierAttribute('id', Movie.prototype, {valueType: 'string?'})).toThrow(
      "The value of an identifier attribute cannot be optional (component: 'Movie', attribute: 'id', specified type: 'string?')"
    );
  });

  // TODO
  // test('Introspection', async () => {
  //   class Movie extends Component {}

  //   const defaultValueFunction = function () {
  //     return this.constructor.generateId();
  //   };

  //   expect(
  //     new IdentifierAttribute('id', Movie.prototype, {
  //       type: 'string',
  //       default: defaultValueFunction,
  //       exposure: {get: true}
  //     }).introspect()
  //   ).toStrictEqual({
  //     name: 'id',
  //     type: 'identifierAttribute',
  //     valueType: 'string',
  //     default: defaultValueFunction,
  //     exposure: {get: true}
  //   });
  // });
});