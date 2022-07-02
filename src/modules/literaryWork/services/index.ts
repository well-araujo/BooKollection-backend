import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LiteraryWorkDto,
  CreateLiteraryWorkDTO,
  UpdateLiteraryWorkDTO,
  getAllLiteraryWork,
  GetUserLiteraryWorksDTO,
} from '../dto';
import { ILiteraryWorkRepository, ILiteraryWorkService } from '../interfaces';
import { LiteraryWork } from '../infra/database';
import {
  I_USER_SERVICE,
  I_LITERARY_WORK_REPOSITORY,
  I_AUTHOR_REPOSITORY,
  I_MY_COLLECTION_SERVICE,
} from '@shared/utils/constants';
import { IUserService } from '@modules/user/interfaces';
import { Language, Status } from '@shared/enum';
import { IAuthorRepository } from '@modules/author/interfaces';
import { IMyCollectionService } from '@modules/myCollection/interfaces';
import { LiteraryWorkDtoCollection } from '../dto';

@Injectable()
export class LiteraryWorkService implements ILiteraryWorkService {
  private readonly logger = new Logger('LiteraryWork service');
  constructor(
    @Inject(I_LITERARY_WORK_REPOSITORY)
    private readonly literaryWorkRepository: ILiteraryWorkRepository,
    @Inject(I_USER_SERVICE)
    private readonly userService: IUserService,
    @Inject(I_AUTHOR_REPOSITORY)
    private readonly authorRepository: IAuthorRepository,
    @Inject(I_MY_COLLECTION_SERVICE)
    private readonly myCollectionRepository: IMyCollectionService,
  ) {}
  async getUserLiteraryWorks(
    userId: string,
    language: Language,
  ): Promise<GetUserLiteraryWorksDTO> {
    const { id, createdAt } = await this.myCollectionRepository.getMyCollection(
      userId,
    );
    const literaryWorks =
      await this.literaryWorkRepository.getUserLiteraryWorks(id, language);

    const literaryWorkCollections = literaryWorks.map((literaryWork) => {
      const literaryWorkAux: LiteraryWorkDtoCollection = {
        ...literaryWork,
        adquiredVolumes: Number(literaryWork.adquiredVolumes),
        totalVolumes: Number(literaryWork.totalVolumes),
        status:
          literaryWork.adquiredVolumes === literaryWork.totalVolumes
            ? Status.Complete
            : Status.InProgress,
      };

      return literaryWorkAux;
    });

    const totalVolumes = literaryWorkCollections.reduce((acc, literaryWork) => {
      acc += literaryWork.adquiredVolumes;
      return acc;
    }, 0);
    const completeLiteraryWorks = literaryWorkCollections.reduce(
      (acc, { adquiredVolumes, totalVolumes }) => {
        if (adquiredVolumes === totalVolumes) {
          acc += 1;
        }
        return acc;
      },
      0,
    );
    return {
      literaryWorks: literaryWorkCollections,
      totalVolumes: totalVolumes,
      completeLiteraryWorks: completeLiteraryWorks,
      totalLiteraryWorks: literaryWorkCollections.length,
      memberSince: createdAt,
    };
  }

  async getAllLiteraryWork(
    data: getAllLiteraryWork,
  ): Promise<LiteraryWorkDto[]> {
    const literaryWorks = await this.literaryWorkRepository.getAllLiteraryWork(
      data,
    );

    const literaryWorksMapped = literaryWorks.map((literaryWork) =>
      this.mapperLiteraryWorkEntityToDto(literaryWork, data.language),
    );

    return literaryWorksMapped;
  }
  async createLiteraryWork(
    data: CreateLiteraryWorkDTO,
  ): Promise<LiteraryWorkDto> {
    this.logger.log('createLiteraryWork');
    const user = await this.userService.getUser(data.adminId);
    const ilustratorBy = await this.authorRepository.getAuthor(
      data.ilustratorBy,
    );
    const writterBy = await this.authorRepository.getAuthor(data.writterBy);

    const LiteraryWorkSaved =
      await this.literaryWorkRepository.createAndSaveLiteraryWork({
        ...data,
        updatedBy: user,
        registeredBy: user,
        writterBy: writterBy,
        ilustratorBy: ilustratorBy,
      });

    return this.mapperLiteraryWorkEntityToDto(LiteraryWorkSaved, null);
  }
  async getLiteraryWork(
    id: string,
    language: Language,
  ): Promise<LiteraryWorkDto> {
    this.logger.log('getLiteraryWork' + id);
    const literaryWork = await this.literaryWorkRepository.getLiteraryWork(id);

    if (!literaryWork) {
      throw new NotFoundException('LiteraryWork not found');
    }
    return this.mapperLiteraryWorkEntityToDto(literaryWork, language);
  }
  async updateLiteraryWork(
    updateLiteraryWorkData: UpdateLiteraryWorkDTO,
  ): Promise<string> {
    this.logger.log('updateLiteraryWork');

    const LiteraryWork = await this.literaryWorkRepository.getLiteraryWork(
      updateLiteraryWorkData.id,
    );
    const user = await this.userService.getUser(updateLiteraryWorkData.adminId);

    const data = Object.assign(LiteraryWork, updateLiteraryWorkData);
    if (LiteraryWork && user) {
      await this.literaryWorkRepository.updateLiteraryWork({
        ...data,
        registeredBy: LiteraryWork.registeredBy,
        updatedBy: user,
      });
      return 'LiteraryWork updated';
    }
    throw new NotFoundException('Cant update LiteraryWork');
  }
  async deleteLiteraryWork(LiteraryWorkId: string): Promise<boolean> {
    this.logger.log('deleteLiteraryWork');
    const LiteraryWork = await this.getLiteraryWork(LiteraryWorkId, null);
    if (!LiteraryWork) {
      throw new NotFoundException('LiteraryWork not found');
    }
    const isDeleted = await this.literaryWorkRepository.deleteLiteraryWork(
      LiteraryWork.id,
    );

    return isDeleted;
  }

  mapperLiteraryWorkEntityToDto = (
    literaryWork: LiteraryWork,
    language: Language,
  ): LiteraryWorkDto => {
    let internationalization = {
      synopsis: '',
    };

    if (
      language &&
      literaryWork.internationalization &&
      literaryWork.internationalization.length > 0
    ) {
      const filteredInter = literaryWork.internationalization.filter(
        (inter) => inter.language === language,
      );
      if (filteredInter.length === 0) {
        internationalization.synopsis = 'notRegistered';
      } else {
        const { synopsis } = filteredInter[0];
        internationalization.synopsis = synopsis;
      }
    } else {
      internationalization = {
        synopsis: null,
        ...internationalization,
      };
    }

    const literaryWorkMapped: LiteraryWorkDto = {
      ...literaryWork,
      registeredBy: literaryWork.registeredBy.name,
      updatedBy: literaryWork.updatedBy.name,
      writterBy: literaryWork.writterBy.name,
      ilustratorBy: literaryWork.ilustratorBy.name,
      ...internationalization,
    };

    return literaryWorkMapped;
  };
}
