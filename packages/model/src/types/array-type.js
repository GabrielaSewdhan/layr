import isEmpty from 'lodash/isEmpty';
import ow from 'ow';

import {Type} from './type';
import {joinModelAttributePath} from '../utilities';

export class ArrayType extends Type {
  constructor(options = {}) {
    ow(
      options,
      'options',
      ow.object.partialShape({
        itemType: ow.object.instanceOf(Type)
      })
    );

    const {itemType, ...otherOptions} = options;

    super(otherOptions);

    this._itemType = itemType;
  }

  getItemType() {
    return this._itemType;
  }

  toString() {
    return `[${this.getItemType().toString()}]${super.toString()}`;
  }

  checkValue(values, options = {}) {
    ow(options, 'options', ow.object.exactShape({modelAttribute: ow.object}));

    const {modelAttribute} = options;

    super.checkValue(values, {modelAttribute});

    if (values === undefined) {
      // `values` is undefined and isOptional() is true
      return;
    }

    const itemType = this.getItemType();

    for (const value of values) {
      itemType.checkValue(value, {modelAttribute});
    }
  }

  _checkValue(values, options) {
    return super._checkValue(values, options) ?? Array.isArray(values);
  }

  _expandAttributeSelector(normalizedAttributeSelector, options) {
    return this.getItemType()._expandAttributeSelector(normalizedAttributeSelector, options);
  }

  runValidators(values, attributeSelector) {
    const failedValidators = super.runValidators(values, attributeSelector);

    if (values !== undefined) {
      const itemType = this.getItemType();

      values.forEach((value, index) => {
        const failedItemValidators = itemType.runValidators(value, attributeSelector);

        for (const {validator, path} of failedItemValidators) {
          failedValidators.push({validator, path: joinModelAttributePath([`[${index}]`, path])});
        }
      });
    }

    return failedValidators;
  }

  introspect() {
    const introspectedArrayType = super.introspect();

    const introspectedItemType = this.getItemType().introspect();
    delete introspectedItemType.valueType;

    if (!isEmpty(introspectedItemType)) {
      introspectedArrayType.items = introspectedItemType;
    }

    return introspectedArrayType;
  }
}