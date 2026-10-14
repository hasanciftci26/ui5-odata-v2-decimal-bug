using {Products as DBProducts} from '../db/data-models';

service SupplyChain {
    entity Products as select from DBProducts;
};
