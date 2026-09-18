import { Api } from '../../shared/api/api.class';
import type { Field, FieldListParams } from './types';
import { FIELDS } from '@shared/api/constants';

export class FieldService {
  private readonly api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  list(params?: FieldListParams): Promise<Field[]> {
    return this.api.get<Field[]>(FIELDS, params);
  }

  featuredList(): Promise<Field[]> {
    return this.api.get<Field[]>(`${FIELDS}featured`);
  }
}
