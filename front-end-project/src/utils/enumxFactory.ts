/**
 * 导出枚举工厂方法
 * 如果有额外的字段，可以添加到 IEnumxItem 中，请添加注释
 *
 * @example
 *
 * const ProductType = enumxFactory({
 *     TEXT: {id: 'text', label: '文本'},
 *     IMAGE: {id: 'image', label: '图片'}
 * });
 *
 * @file enumxFactory.ts
 */

/**
 * 枚举对象的接口
 *
 * @interface IEnumxItem
 */
type IEnumxItem = {
    [key: string]: any;
} & {
    /**
     * 枚举值
     *
     * @type {string | number}
     * @memberof IEnumxItem
     */
    id: string | number;

    /**
     * 枚举对应的label
     *
     * @type {string}
     * @memberof IEnumxItem
     */
    label: string;

    /**
     * 枚举项对应的 alias
     *
     * @type {string}
     */
    alias?: string;

    /**
     * 颜色
     *
     * @type {string}
     * @memberof IEnumxItem
     */
    color?: string;

    /**
     * 正则
     *
     * @type {RegExp}
     * @memberof IEnumxItem
     */
    reg?: RegExp;

    /**
     * 是否不可用
     *
     * @type {boolean}
     */
    disabled?: boolean;
};

interface IEnumxItemOptions {
    [key: string]: IEnumxItem;
}

export class Enumx<T extends IEnumxItemOptions> {
    public itemList: (IEnumxItem & T[keyof T])[] = [];

    constructor(options: IEnumxItemOptions) {
        Object.keys(options).forEach(key => {
            const item = options[key];
            item.alias = key;
            (this as any)[key] = item.id;
            this.itemList.push(item as any);
        });
    }

    /**
     * alias 枚举，开发阶段类型推断用
     *
     * @type {keyof T}
     * @memberof Enumx
     */
    public aliasEnum!: keyof T;

    /**
     * id 枚举，开发阶段类型推断用
     *
     * @type {T[keyof T]['id']}
     * @memberof Enumx
     */
    public idsEnum!: T[keyof T]['id'];

    /**
     * 转数组
     *
     * @returns
     * @memberof Enumx
     */
    toArray() {
        return this.itemList.slice().filter(item => !!localStorage.getItem('DataEnumsAll') || !item.disabled);
    }

    /**
     * 根据 id/value 找枚举项
     *
     * @param {any} id
     * @returns {IEnumxItem}
     * @memberof Enumx
     */
    getItemById(id: any): (IEnumxItem & T[keyof T]) | undefined {
        return this.itemList.find(item => item.id === id) as (IEnumxItem & T[keyof T]) | undefined;
    }

    /**
     * 根据 id/value 获取对应枚举项的label
     *
     * @param {any} id
     * @returns {string}
     * @memberof Enumx
     */
    getLabelById(id: any): string {
        const item = this.getItemById(id);
        return item ? item.label : '';
    }
}

/**
 * 枚举工厂方法
 *
 * @export
 * @template T
 * @param {T} options
 * @returns {(Enumx<T> & {[key in keyof T]: T[key]['id']})}
 */
export function enumxFactory<T extends IEnumxItemOptions>(options: T): Enumx<T> & {[key in keyof T]: T[key]['id']} {
    return new Enumx(options) as Enumx<T> & {
        [key in keyof T]: T[key]['id'];
    };
}
