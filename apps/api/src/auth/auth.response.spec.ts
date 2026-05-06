import { createUserDocument } from './testing/auth-test-helpers';
import { CurrentUserDto } from './dto/current-user.dto';

describe('CurrentUserDto', () => {
  it('does not leak passwordHash when mapping a user document', () => {
    const user = createUserDocument({
      passwordHash: 'super-secret-hash'
    });

    const result = CurrentUserDto.fromUserDocument(user);

    expect(result).toEqual({
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});
