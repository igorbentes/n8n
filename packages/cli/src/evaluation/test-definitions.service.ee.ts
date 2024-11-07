import { Service } from 'typedi';

import type { TestDefinition } from '@/databases/entities/test-definition.ee';
import { AnnotationTagRepository } from '@/databases/repositories/annotation-tag.repository.ee';
import { TestDefinitionRepository } from '@/databases/repositories/test-definition.repository.ee';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { validateEntity } from '@/generic-helpers';
import type { ListQuery } from '@/requests';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

type TestDefinitionLike = Omit<
	Partial<TestDefinition>,
	'workflow' | 'evaluationWorkflow' | 'annotationTag'
> & {
	workflow?: { id: string };
	evaluationWorkflow?: { id: string };
	annotationTag?: { id: string };
};

@Service()
export class TestDefinitionsService {
	constructor(
		private testRepository: TestDefinitionRepository,
		private annotationTagRepository: AnnotationTagRepository,
	) {}

	private toEntityLike(attrs: {
		name?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: number;
	}) {
		const entity: TestDefinitionLike = {};

		if (attrs.id) {
			entity.id = attrs.id;
		}

		if (attrs.name) {
			entity.name = attrs.name?.trim();
		}

		if (attrs.workflowId) {
			entity.workflow = {
				id: attrs.workflowId,
			};
		}

		if (attrs.evaluationWorkflowId) {
			entity.evaluationWorkflow = {
				id: attrs.evaluationWorkflowId,
			};
		}

		if (attrs.annotationTagId) {
			entity.annotationTag = {
				id: attrs.annotationTagId,
			};
		}

		return entity;
	}

	toEntity(attrs: {
		name?: string;
		workflowId?: string;
		evaluationWorkflowId?: string;
		annotationTagId?: string;
		id?: number;
	}) {
		const entity = this.toEntityLike(attrs);
		return this.testRepository.create(entity);
	}

	async findOne(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.getOne(id, accessibleWorkflowIds);
	}

	async save(test: TestDefinition) {
		await validateEntity(test);

		return await this.testRepository.save(test);
	}

	async update(id: number, attrs: TestDefinitionLike, accessibleWorkflowIds: string[]) {
		if (attrs.name) {
			const updatedTest = this.toEntity(attrs);
			await validateEntity(updatedTest);
		}

		// Do not allow updating the workflow ID after test definition creation
		if (attrs.workflowId) {
			delete attrs.workflowId;
		}

		// Check if the annotation tag exists
		if (attrs.annotationTagId) {
			const annotationTagExists = await this.annotationTagRepository.exists({
				where: {
					id: attrs.annotationTagId,
				},
			});

			if (!annotationTagExists) {
				throw new BadRequestError('Annotation tag not found');
			}
		}

		// Update the test definition
		const queryResult = await this.testRepository.update(id, this.toEntityLike(attrs));

		if (queryResult.affected === 0) {
			throw new NotFoundError('Test definition not found');
		}

		return await this.testRepository.getOne(id, accessibleWorkflowIds);
	}

	async delete(id: number, accessibleWorkflowIds: string[]) {
		return await this.testRepository.deleteById(id, accessibleWorkflowIds);
	}

	async getMany(options: ListQuery.Options, accessibleWorkflowIds: string[] = []) {
		return await this.testRepository.getMany(accessibleWorkflowIds, options);
	}
}
