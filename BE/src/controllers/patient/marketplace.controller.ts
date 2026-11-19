import type { RequestHandler } from 'express';
import { z } from 'zod';
import { marketplace } from '../../services/patient/marketplace.service.js';
import { marketplaceQuery,facilityIdSchema,availabilityQuery } from '../../validation/patient/marketplace.schema.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
function parse<T>(schema:z.ZodType<T>,value:unknown) { const result=schema.safeParse(value); if (!result.success) throw new HttpError(400,API_ERROR_MESSAGES.INVALID_MARKETPLACE_QUERY); return result.data; }
export function createMarketplaceControllers(service=marketplace) {
  const list:RequestHandler=async(req,res)=>{res.json(await service.list(parse(marketplaceQuery,req.query)));};
  const detail:RequestHandler=async(req,res)=>{res.json(await service.detail(parse(facilityIdSchema,req.params.facilityId)));};
  const slots:RequestHandler=async(req,res)=>{ const id=parse(facilityIdSchema,req.params.facilityId); const {date}=parse(availabilityQuery,req.query); res.set('Cache-Control','no-store').json(await service.slots(id,date)); };
  return {list,detail,slots};
}
