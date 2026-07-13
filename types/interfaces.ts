export interface Order {
    _id: string;
    orderId: string;
    products: {
        b12: number;
        b19: number;
    };
    status: string;
    sum: number;
    opForm?: string;
    comment?: string;
    clientReview?: number;
    clientNotes?: string[];
    clientTitle?: string;
    clientPhone?: string;
    clientAddress?: string;
    clientAddressLink?: string;
    clientPoints?: {
        lat: number;
        lon: number;
    };
    date: string;
    aquaMarketAddress?: string;
    aquaMarketAddressLink?: string;
    aquaMarketPoints?: {
        lat: number;
        lon: number;
    };
    step: string;
    createdAt: string;
    updatedAt: string;
    income: number;
    needCall: boolean;
    address: {
        name: string;
        actual: string;
        link: string;
        phone: string;
        point: {
            lat: number;
            lon: number;
        }
    };
    client: {
        fullName: string;
        _id: string;
        price12: number;
        price19: number;
    };
    notificationToken: string;
}

export interface CourierData {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    income: number;
    availableIncome?: number;
    price12?: number;
    price19?: number;
    password: string;
    onTheLine: boolean;
    order?: Order;
    notAccesptedKol: number;
    status: 'awaitingVerfication' | 'active' | 'inActive' | 'deleted';
    carNumber: string;
    blockTime?: Date;
    IIN: string;
    idCardNumber: string;
    balance: number;
    raiting: number;
    carType: 'A' | 'B' | 'C';
    wholeList: boolean;
    phoneVision: boolean;
    notificationPushToken: string;
    firstName: string;
    lastName: string;
    languages: string[];
    birthDate?: string;
    country: string;
    city: string;
    transport: 'A' | 'B' | 'C';
    inviteCode: string;
    termsAccepted: boolean;
    privacyAccepted: boolean;
    point?: {
        lat: number;
        lon: number;
        timestamp: Date;
    };
    orders: Order[];
    soldBootles?: {
        kol: number;
        date: Date;
    };
    capacity12?: number;
    capacity19?: number;
    createdAt: string;
    updatedAt: string;
    emptyBottles12?: number;
    emptyBottles19?: number;
}

export interface FinanceType {
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
    status: 'processing' | 'credited' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface TokenData {
    token: string;
}

export interface OrderChatMessage {
    _id: string;
    text: string;
    sender: 'client' | 'courier';
    timestamp: string;
    isRead?: boolean;
}

export interface NotificationTokenData {
    notificationPushToken: string;
}

export interface OrderHistory {
    _id: string;
    franchisee: string;
    client: string;
    address: {
        name: string;
        actual: string;
        link: string;
        phone: string;
        point: {
            lat: number;
            lon: number;
        }
    };
    products: {
        b12: number;
        b19: number;
    };
    date: {
        d: string;
        time: string;
    };
    status: string;
    sum: number;
    courier: string;
    history: string[];
    transferred: boolean;
    transferredFranchise: string;
    opForm: string;
    comment: string;
    clientReview: number;
    clientNotes: string[];
    income: number;
    aquaMarketAddress: string;
    createdAt: string;
    updatedAt: string;
}