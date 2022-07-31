// === BareAttributes ===
// https://stackblitz.com/edit/typescript-nw5qyh?file=index.ts

type IfEquals<X, Y, T> =
    (<T>() => T extends X ? 1 : 2) extends
        (<T>() => T extends Y ? 1 : 2) ? T : never;

/**
 * Returns only attributes from a class that are not getters, setters, readonly, nor functions.
 */
type BareAttributes<T> = Pick<T, {
    [P in keyof T]: IfEquals<{ [Q in P]: T[P] extends Function ? never : T[P] }, { -readonly [Q in P]: T[P] }, P>
}[keyof T]>;

// === Generic Typescript utilities ===

type Class = new (...args: any[]) => void;
type Key = keyof any;

// === Core ORM Typings ===

type PrimitiveType = number | string | boolean;

type Expression<Type extends PrimitiveType> = {
    __meta__: {
        $type: 'column' | 'literal' | 'derived' | 'targetElement',
        type: Type,
    },
    as: <Label extends string>(label: Label) => LabeledExpression<Type, Expression<Type>, Label>;
} & ExpressionMethods<Type>;

type ExpressionMethods<Type extends PrimitiveType> =
  Type extends number ? {
    plus: (rhs: Expression<number> | number) => Expression<number>;
    minus: (rhs: Expression<number> | number) => Expression<number>;
    times: (rhs: Expression<number> | number) => Expression<number>;
    dividedBy: (rhs: Expression<number> | number) => Expression<number>;

    equals: (rhs: Expression<number> | number) => Expression<boolean>;
    gt: (rhs: Expression<number> | number) => Expression<boolean>;
    gte: (rhs: Expression<number> | number) => Expression<boolean>;
    ls: (rhs: Expression<number> | number) => Expression<boolean>;
    lse: (rhs: Expression<number> | number) => Expression<boolean>;
}
: Type extends string ? {
    plus: (rhs: Expression<string> | string) => Expression<string>;
    contains: (rhs: Expression<string> | string) => Expression<boolean>;

    equals: (rhs: Expression<string> | string) => Expression<boolean>;
    gt: (rhs: Expression<string> | string) => Expression<boolean>;
    gte: (rhs: Expression<string> | string) => Expression<boolean>;
    ls: (rhs: Expression<string> | string) => Expression<boolean>;
    lse: (rhs: Expression<string> | string) => Expression<boolean>;
}
: Type extends boolean ? {
    and: (rhs: Expression<boolean> | boolean) => Expression<boolean>;
    or: (rhs: Expression<boolean> | boolean) => Expression<boolean>;
} : never;

type Literal<Type extends PrimitiveType> = {
    __meta__: {
        $type: 'literal',
        value: Type,
        type: Type,
    };
    as: <Label extends string>(label: Label) => LabeledExpression<Type, Literal<Type>, Label>;
} & Expression<Type>

type Column<T extends Class, K extends Key, Type extends PrimitiveType> = {
    __meta__: {
        $type: 'column',
        key: K,
        type: Type,
    },
    as: <Label extends string>(label: Label) => LabeledExpression<Type, Column<T, K, Type>, Label>;
} & Expression<Type>;

type Columns<T extends Class> = Column<T, any, any>[];

type Derived<T extends Class, K extends Key, Type> = {
    __meta__: {
        $type: 'derived',
        key: K,
        type: Type,
    }
};

type Expressions = Expression<PrimitiveType>[];

type LabeledExpression<Type extends PrimitiveType, E extends Expression<Type>, Label extends string> = {
    __meta__: {
        $type: 'labeledExpression',
        label: Label,
        expression: E,
    }
}

type TargetElementT = Expression<PrimitiveType> | LabeledExpression<PrimitiveType, any, any>;
type TargeListT = TargetElementT[];

type BooleanExpressions = Expression<boolean>[];

/**
 * Shim type to create an understandable error message.
 */
interface NonPrimitiveTypeAttribute<T extends Class, key> {
    __nonPrimitive: true,
}

/**
 * Shim type to create an understandable error message.
 */
interface FunctionTypeAttribute<T extends Class, key> {
    __function: true,
}

type ModelAttributes<T extends Class> = {
    [key in keyof InstanceType<T>]: key extends keyof BareAttributes<InstanceType<T>>
        ? (InstanceType<T>[key] extends PrimitiveType ?  Column<T, key, InstanceType<T>[key]> : NonPrimitiveTypeAttribute<T, key>)
        : (InstanceType<T>[key] extends Function ? FunctionTypeAttribute<T, key> : Derived<T, key, InstanceType<T>[key]>)
};

type Entity<T extends Class> = T & ModelAttributes<T> & {objects: Statement<T, [], []>};

interface Statement<T extends Class, TargetList extends TargeListT, GroupByList extends Expressions> {
    __meta__: {
        $type: 'statement',

        targetList: TargetList,
        groupByList: GroupByList,
    },

    load: <NewTargetList extends TargeListT>(...targetList: NewTargetList) => Statement<T, NewTargetList, GroupByList>
    filter: (...filters: BooleanExpressions) => Statement<T, TargetList, GroupByList>,
    groupBy: <NewGroupByList extends Expressions>(...fiters: NewGroupByList) => Statement<T, TargetList, NewGroupByList>,
    having: (...filters: BooleanExpressions) => Statement<T, TargetList, GroupByList>,
}

const define = <T extends Class>(model: T) => {
    return {} as Entity<T>;
}

const literal = <Type extends PrimitiveType>(value: Type): Literal<Type> => {
    return {
        __meta__: {
            $type: 'literal',
            value,
            type: value,
        }
    } as Literal<Type>;
}

class UserModel {
    id: number;
    firstName: string;
    lastName: string;
    age: number;
    foo: {a: number};

    get isMajor(): boolean {
        return this.age > 18;
    }

    get infos(): {a: number} {
        return {
            a: this.age,
        }
   }

   doSomething() {

   }
}

const User = define(UserModel);

const result = User.objects
    .load(User.firstName.as('foo'), literal(1).plus(User.age).as('value'))
    .filter(
        User.id.gt(1),
        User.id.plus(12).gte(12),
    ).filter(
        User.firstName.contains("foo").or(User.age.ls(10)),
        User.age.ls(10),
        User.id.ls(10),
    ).groupBy(
        User.id,
        User.firstName.ls("12"),
    ).having(
        User.firstName.contains("12"),
    );